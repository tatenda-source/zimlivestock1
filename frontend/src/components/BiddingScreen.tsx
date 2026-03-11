import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { PaynowButton } from './PaynowButton';
import { useAuthStore } from '@/stores/authStore';
import { paymentAPI, livestockAPI } from '@/services/api';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Weight,
  Calendar,
  TrendingUp,
  Heart,
  Share,
  MessageCircle,
  Shield,
  Award,
  Smartphone,
  Globe,
  Loader2,
} from 'lucide-react';

interface Bid {
  id: string;
  bidder_id: string;
  bidder: string;
  amount: number;
  timestamp: Date;
  isWinning: boolean;
}

interface BiddingScreenProps {
  onBack: () => void;
  livestockItem: any;
}

export function BiddingScreen({ onBack, livestockItem }: BiddingScreenProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [isLoadingBids, setIsLoadingBids] = useState(true);

  // Payment method dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'web' | 'ecocash' | 'onemoney'>('ecocash');
  const [mobilePhone, setMobilePhone] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [mobilePaymentRef, setMobilePaymentRef] = useState<string | null>(null);
  const [mobilePaymentInstructions, setMobilePaymentInstructions] = useState<string | null>(null);

  // Use real timeLeft from item or calculate from auctionEndDate
  const timeLeft = livestockItem.timeLeft || (() => {
    if (!livestockItem.auctionEndDate) return 'Ended';
    const end = new Date(livestockItem.auctionEndDate);
    const now = new Date();
    if (end <= now) return 'Ended';
    const diffMs = end.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  })();

  const fetchBids = async () => {
    try {
      const bidsRes = await livestockAPI.getBidsForItem(livestockItem.id);
      const rawBids = bidsRes.data;

      const formattedBids: Bid[] = rawBids.map((b: any, index: number) => ({
        id: String(b.id),
        bidder_id: String(b.bidder_id),
        bidder: `Bidder ${String(b.bidder_id).slice(0, 6)}`,
        amount: b.amount,
        timestamp: new Date(b.timestamp || b.created_at),
        isWinning: index === 0,
      }));

      setBidHistory(formattedBids);
    } catch (error) {
      console.error('Failed to fetch bids', error);
    } finally {
      setIsLoadingBids(false);
    }
  };

  useEffect(() => {
    fetchBids();
  }, [livestockItem.id]);

  const currentHighestBid = bidHistory[0]?.amount || livestockItem.currentBid || livestockItem.startingPrice;
  const minimumBid = currentHighestBid + 50;

  useEffect(() => {
    setBidAmount(minimumBid.toString());
  }, [minimumBid]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const { user, isAuthenticated } = useAuthStore();

  const handlePlaceBid = async () => {
    const amount = parseInt(bidAmount);
    if (amount >= minimumBid) {
      try {
        await livestockAPI.placeBid({
          livestock_id: livestockItem.id,
          amount: amount
        });
        toast.success(`Bid of ${formatCurrency(amount)} placed!`);
        fetchBids();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Failed to place bid. Please try again.');
      }
    }
  };

  // Fixed winner detection: compare bidder_id to logged-in user id
  const isWinning = bidHistory.length > 0 && user && bidHistory[0].bidder_id === user.id;
  const canPay = (livestockItem.healthStatus === 'sold' || timeLeft === 'Ended') && isWinning;

  const handlePayNowClick = () => {
    if (!isAuthenticated || !user) {
      toast.error('Please login to make a payment');
      return;
    }
    // Pre-fill phone from user profile if available
    if (user.phone && !mobilePhone) {
      setMobilePhone(user.phone);
    }
    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = async () => {
    if (!user) return;

    // Validate phone for mobile payments
    if (paymentMethod !== 'web') {
      const cleanPhone = mobilePhone.replace(/\s/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        toast.error('Please enter a valid phone number');
        return;
      }
    }

    setIsPaying(true);
    try {
      const payload: any = {
        livestock_id: livestockItem.id,
        bid_id: bidHistory[0] ? parseInt(bidHistory[0].id) : 0,
        payment_method: paymentMethod,
      };

      if (paymentMethod !== 'web') {
        payload.phone = mobilePhone.replace(/\s/g, '');
      }

      const res = await paymentAPI.initiate(payload);

      if (paymentMethod === 'web' && res.redirect_url) {
        // Redirect to Paynow web checkout
        window.location.href = res.redirect_url;
      } else {
        // Mobile payment — show instructions and start polling
        setMobilePaymentRef(res.reference);
        setMobilePaymentInstructions(
          res.instructions || 'Check your phone for the payment prompt. Dial *151# if you miss it.'
        );
        setShowPaymentDialog(false);
        toast.success('Payment prompt sent to your phone!');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.detail || err?.message || 'Payment failed';
      toast.error(msg);
    } finally {
      setIsPaying(false);
    }
  };

  // Poll for mobile payment status
  useEffect(() => {
    if (!mobilePaymentRef) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await paymentAPI.getStatus(mobilePaymentRef);
        if (status.paid) {
          clearInterval(pollInterval);
          setMobilePaymentRef(null);
          setMobilePaymentInstructions(null);
          toast.success('Payment confirmed! Thank you.');
        } else if (status.status === 'cancelled' || status.status === 'failed') {
          clearInterval(pollInterval);
          setMobilePaymentRef(null);
          setMobilePaymentInstructions(null);
          toast.error(`Payment ${status.status}. Please try again.`);
        }
      } catch {
        // Silently retry on poll failure
      }
    }, 5000);

    // Stop polling after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [mobilePaymentRef]);

  // Derive seller display info safely — API data is flat, mock data has nested seller
  const sellerName = livestockItem.seller?.name
    || livestockItem.seller_name
    || 'Seller';
  const sellerAvatar = livestockItem.seller?.avatar;
  const sellerVerified = livestockItem.seller?.verified ?? livestockItem.healthStatus === 'verified';

  // Health status display
  const healthStatusLabel: Record<string, string> = {
    verified: 'Verified',
    pending: 'Pending',
    rejected: 'Rejected',
    sold: 'Sold',
  };
  const healthColor: Record<string, string> = {
    verified: 'text-green-600',
    pending: 'text-yellow-600',
    rejected: 'text-red-600',
    sold: 'text-blue-600',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
              className="p-2"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <Share className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="pb-32">
        {/* Image */}
        <div className="relative">
          <ImageWithFallback
            src={livestockItem.imageUrl}
            alt={livestockItem.title}
            className="w-full h-64 object-cover"
          />
          <div className="absolute bottom-4 left-4">
            <Badge className="bg-primary/90 text-primary-foreground text-base px-3 py-1">
              {livestockItem.breed}
            </Badge>
          </div>
          <div className="absolute bottom-4 right-4">
            <Badge variant={timeLeft === 'Ended' ? 'secondary' : 'destructive'} className="text-base px-3 py-1">
              <Clock className="w-4 h-4 mr-1" />
              {timeLeft}
            </Badge>
          </div>
        </div>

        {/* Mobile Payment Pending Banner */}
        {mobilePaymentRef && mobilePaymentInstructions && (
          <div className="mx-4 mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <p className="font-semibold text-blue-900">Waiting for payment...</p>
            </div>
            <p className="text-sm text-blue-800">{mobilePaymentInstructions}</p>
            <p className="text-xs text-blue-600 font-mono">Ref: {mobilePaymentRef}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Title and Current Bid */}
          <div>
            <h1 className="text-2xl font-bold mb-2">{livestockItem.title}</h1>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Highest Bid</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(currentHighestBid)}</p>
                <p className="text-sm text-muted-foreground">
                  Starting at {formatCurrency(livestockItem.startingPrice)}
                </p>
              </div>
              <div className="text-right">
                {currentHighestBid > livestockItem.startingPrice && (
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      +{((currentHighestBid - livestockItem.startingPrice) / livestockItem.startingPrice * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{bidHistory.length} bids</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Age</p>
                <p className="font-medium">{livestockItem.age || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Weight className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Weight</p>
                <p className="font-medium">{livestockItem.weight || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{livestockItem.location || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Health</p>
                <p className={`font-medium ${healthColor[livestockItem.healthStatus] || 'text-muted-foreground'}`}>
                  {healthStatusLabel[livestockItem.healthStatus] || livestockItem.healthStatus || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Seller Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={sellerAvatar} />
                    <AvatarFallback>{sellerName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{sellerName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {sellerVerified && (
                        <>
                          <Shield className="w-3 h-3 text-green-600" />
                          <span className="text-green-600">Verified Farmer</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chat
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Description */}
          {livestockItem.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{livestockItem.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Bid History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Bid History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingBids ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : bidHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No bids yet. Be the first!</p>
              ) : (
                bidHistory.map((bid, index) => (
                  <div key={bid.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{bid.bidder.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {bid.bidder_id === user?.id ? 'You' : bid.bidder}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatTimeAgo(bid.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${index === 0 ? 'text-primary' : 'text-foreground'}`}>
                        {formatCurrency(bid.amount)}
                      </p>
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">Winning</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Bottom Bidding Section */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Minimum bid</p>
            <p className="font-bold text-lg">{formatCurrency(minimumBid)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Auction ends in</p>
            <p className="font-bold text-lg text-red-600">{timeLeft}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {!canPay ? (
            <>
              <div className="flex-1">
                <Input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Min ${formatCurrency(minimumBid)}`}
                  className="h-12 text-center font-semibold"
                  min={minimumBid}
                />
              </div>
              <Button
                className="h-12 px-8 flex-1"
                onClick={handlePlaceBid}
                disabled={parseInt(bidAmount) < minimumBid || timeLeft === 'Ended'}
              >
                Place Bid
              </Button>
            </>
          ) : (
            <PaynowButton
              className="h-12 w-full"
              onClick={handlePayNowClick}
              disabled={isPaying || !!mobilePaymentRef}
            />
          )}
        </div>
      </div>

      {/* Payment Method Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Pay {formatCurrency(currentHighestBid)} for {livestockItem.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as 'web' | 'ecocash' | 'onemoney')}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="ecocash" id="ecocash" />
                <Label htmlFor="ecocash" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Smartphone className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">EcoCash</p>
                    <p className="text-xs text-muted-foreground">Pay via EcoCash mobile money</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="onemoney" id="onemoney" />
                <Label htmlFor="onemoney" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">OneMoney</p>
                    <p className="text-xs text-muted-foreground">Pay via OneMoney mobile money</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="web" id="web" />
                <Label htmlFor="web" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Globe className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Visa / Bank / ZIPIT</p>
                    <p className="text-xs text-muted-foreground">Pay online via Paynow checkout</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {/* Phone number input for mobile payments */}
            {paymentMethod !== 'web' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                  placeholder={paymentMethod === 'ecocash' ? '0771 234 567' : '0714 234 567'}
                  className="h-12 text-center font-mono text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  You'll receive a USSD prompt on this number to confirm payment
                </p>
              </div>
            )}

            <Button
              className="w-full h-12"
              onClick={handlePaymentSubmit}
              disabled={isPaying}
            >
              {isPaying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${formatCurrency(currentHighestBid)}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
