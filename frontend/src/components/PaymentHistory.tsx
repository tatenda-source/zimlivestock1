import { useQuery } from 'react-query';
import { paymentAPI } from '@/services/api';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export function PaymentHistory() {
  const { data: payments, isLoading, error } = useQuery(
    'payment-history',
    paymentAPI.getUserPayments,
    { staleTime: 30 * 1000 }
  );

  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    paid: { icon: CheckCircle2, color: 'text-green-600', label: 'Paid' },
    pending: { icon: Clock, color: 'text-yellow-600', label: 'Pending' },
    cancelled: { icon: XCircle, color: 'text-red-600', label: 'Cancelled' },
    failed: { icon: AlertCircle, color: 'text-red-600', label: 'Failed' },
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 space-y-2">
        <AlertCircle className="w-10 h-10 mx-auto text-destructive" />
        <p className="text-muted-foreground">Failed to load payment history</p>
      </div>
    );
  }

  const paymentList = Array.isArray(payments) ? payments : [];

  return (
    <div className="space-y-4 pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4">
        <h1 className="text-xl font-bold">Payment History</h1>
        <p className="text-sm text-muted-foreground">Your transaction records</p>
      </div>

      <div className="px-4 space-y-3">
        {paymentList.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No payments yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              When you win an auction and pay, your transactions will appear here.
            </p>
          </div>
        ) : (
          paymentList.map((payment: any) => {
            const config = statusConfig[payment.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <Card key={payment.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${config.color}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {payment.merchant_reference}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.payment_method === 'web' ? 'Online Payment' :
                           payment.payment_method === 'ecocash' ? 'EcoCash' :
                           payment.payment_method === 'onemoney' ? 'OneMoney' :
                           payment.payment_method}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${payment.amount?.toLocaleString()}</p>
                      <Badge
                        variant={payment.status === 'paid' ? 'default' : 'secondary'}
                        className="text-xs mt-1"
                      >
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
