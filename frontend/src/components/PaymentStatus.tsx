import { useEffect, useState, useRef } from 'react';
import { paymentAPI } from '@/services/api';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';

interface PaymentStatusProps {
    reference: string;
    onBack: () => void;
}

export function PaymentStatus({ reference, onBack }: PaymentStatusProps) {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await paymentAPI.getStatus(reference);
                setStatus(data);

                // If still pending, keep polling every 5 seconds
                const isPending = !data.paid && data.status !== 'cancelled' && data.status !== 'failed';
                if (isPending && !pollRef.current) {
                    pollRef.current = setInterval(async () => {
                        try {
                            const updated = await paymentAPI.getStatus(reference);
                            setStatus(updated);
                            if (updated.paid || updated.status === 'cancelled' || updated.status === 'failed') {
                                if (pollRef.current) {
                                    clearInterval(pollRef.current);
                                    pollRef.current = null;
                                }
                                if (updated.paid) toast.success('Payment confirmed!');
                            }
                        } catch {
                            // Silently retry
                        }
                    }, 5000);
                }
            } catch (err: any) {
                console.error('Failed to fetch payment status', err);
                toast.error('Could not get payment status.');
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();

        // Stop polling after 5 minutes and on unmount
        const timeout = setTimeout(() => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        }, 5 * 60 * 1000);

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            clearTimeout(timeout);
        };
    }, [reference]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground">Checking payment...</p>
                </div>
            </div>
        );
    }

    if (!status) {
        return <p className="text-center p-4">No payment information available.</p>;
    }

    const isPaid = status.paid || status.status?.toLowerCase() === 'paid';
    const isFailed = status.status?.toLowerCase() === 'cancelled' || status.status?.toLowerCase() === 'failed';
    const isPending = !isPaid && !isFailed;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
            <div className="max-w-md w-full bg-card shadow-xl rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="flex justify-center mb-6">
                    {isPaid ? (
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                    ) : isFailed ? (
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        </div>
                    )}
                </div>

                <h2 className="text-2xl font-bold mb-2">
                    {isPaid ? 'Payment Successful' : isFailed ? `Payment ${status.status}` : 'Payment Pending'}
                </h2>

                <div className="space-y-4 my-6">
                    <div className="bg-muted p-3 rounded-lg text-sm font-mono break-all text-muted-foreground">
                        Ref: {status.reference}
                    </div>

                    <p className="text-muted-foreground">
                        {isPaid
                            ? 'Your transaction has been confirmed. Thank you for your purchase!'
                            : isPending
                            ? 'We are waiting for payment confirmation. This page will update automatically.'
                            : 'Your payment was not completed. Please try again.'}
                    </p>

                    {status.redirect_url && isPending && (
                        <Button asChild className="w-full">
                            <a href={status.redirect_url}>
                                Complete in Browser
                            </a>
                        </Button>
                    )}

                    {status.instructions && isPending && (
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm italic">
                            {status.instructions}
                        </div>
                    )}

                    {isPending && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>Auto-refreshing every 5 seconds...</span>
                        </div>
                    )}
                </div>

                <Button variant="outline" className="w-full mt-4" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Marketplace
                </Button>
            </div>
        </div>
    );
}
