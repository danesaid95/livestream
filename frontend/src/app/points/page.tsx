"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Check,
  CreditCard,
  Shield,
  Zap,
  Gift,
  TrendingUp,
  Clock,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth";
import { pointsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

interface PointPackage {
  id: string;
  name: string;
  points: number;
  price: number;
  bonusPoints: number;
  isPopular: boolean;
  isBestValue: boolean;
  badgeText?: string;
}

interface BackendPointPackage {
  id: string;
  name: string;
  points: number;
  priceUsd: number;
  bonusPoints: number;
  isFeatured: boolean;
  badgeText?: string;
}

interface Transaction {
  id: string;
  type: "purchase" | "gift_sent" | "gift_received" | "bonus";
  amount: number;
  description: string;
  createdAt: string;
}

interface PaymentModalProps {
  clientSecret: string;
  packageDetails: {
    name: string;
    points: number;
    bonusPoints: number;
    price: number;
  };
  onClose: () => void;
  onSuccess: (points: number) => void;
}

function CheckoutForm({ packageDetails, onClose, onSuccess }: Omit<PaymentModalProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message || "Payment failed");
      setIsProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        const response = await pointsApi.confirmPayment(paymentIntent.id);
        onSuccess(response.data.points || response.data.data?.points || packageDetails.points + packageDetails.bonusPoints);
      } catch (err) {
        setError("Payment succeeded but failed to add points. Please contact support.");
      }
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center pb-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">{packageDetails.name}</h3>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="text-2xl font-bold text-white">
            {(packageDetails.points + packageDetails.bonusPoints).toLocaleString()}
          </span>
          <span className="text-gray-400">points</span>
        </div>
        <p className="text-xl font-bold text-white mt-2">${packageDetails.price.toFixed(2)}</p>
      </div>

      <PaymentElement />

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-violet-600 hover:bg-violet-700"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ${packageDetails.price.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function PaymentModal({ clientSecret, packageDetails, onClose, onSuccess }: PaymentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-md mx-4 bg-gray-900 rounded-xl border border-gray-700 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "night",
              variables: {
                colorPrimary: "#8b5cf6",
                colorBackground: "#1f2937",
                colorText: "#f3f4f6",
                colorDanger: "#ef4444",
                borderRadius: "8px",
              },
            },
          }}
        >
          <CheckoutForm
            packageDetails={packageDetails}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </Elements>
      </div>
    </div>
  );
}

export default function PointsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<PointPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    clientSecret: string;
    packageDetails: { name: string; points: number; bonusPoints: number; price: number };
  } | null>(null);
  const { refreshUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [packagesRes, transactionsRes] = await Promise.all([
          pointsApi.getPackages(),
          pointsApi.getTransactions(),
        ]);

        // Transform backend data to frontend format
        const backendPackages: BackendPointPackage[] = packagesRes.data.data || packagesRes.data || [];
        const transformedPackages: PointPackage[] = backendPackages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          points: pkg.points,
          price: Number(pkg.priceUsd),
          bonusPoints: pkg.bonusPoints,
          isPopular: pkg.isFeatured || pkg.badgeText === 'BEST VALUE',
          isBestValue: pkg.badgeText === 'BEST DEAL' || pkg.badgeText === 'MOST POINTS',
          badgeText: pkg.badgeText,
        }));

        setPackages(transformedPackages);
        setTransactions(transactionsRes.data.data?.transactions || transactionsRes.data?.transactions || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, router]);

  const handlePurchase = async (pkg: PointPackage) => {
    setSelectedPackage(pkg);
    setIsPurchasing(true);

    try {
      const response = await pointsApi.createPaymentIntent(pkg.id);
      const data = response.data.data || response.data;

      setPaymentModal({
        clientSecret: data.clientSecret,
        packageDetails: data.packageDetails,
      });
    } catch (error) {
      console.error("Failed to create payment:", error);
      alert("Failed to start payment. Please try again.");
    } finally {
      setIsPurchasing(false);
      setSelectedPackage(null);
    }
  };

  const handlePaymentSuccess = async (points: number) => {
    setPaymentModal(null);
    // Refresh user data to show new balance
    if (refreshUser) {
      await refreshUser();
    }
    // Refetch transactions
    try {
      const transactionsRes = await pointsApi.getTransactions();
      setTransactions(transactionsRes.data.data?.transactions || transactionsRes.data?.transactions || []);
    } catch (error) {
      console.error("Failed to refresh transactions:", error);
    }
    alert(`Successfully purchased ${points.toLocaleString()} points!`);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <CreditCard className="w-5 h-5 text-green-400" />;
      case "gift_sent":
        return <Gift className="w-5 h-5 text-pink-400" />;
      case "gift_received":
        return <Gift className="w-5 h-5 text-yellow-400" />;
      case "bonus":
        return <Sparkles className="w-5 h-5 text-violet-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      {paymentModal && (
        <PaymentModal
          clientSecret={paymentModal.clientSecret}
          packageDetails={paymentModal.packageDetails}
          onClose={() => setPaymentModal(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-900/30 border border-violet-500/30 rounded-full mb-4">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-violet-300 text-sm font-medium">Points Store</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Get Points, Send Love
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Purchase points to send gifts to your favorite creators and show your support during their streams.
          </p>
        </div>

        {/* Current Balance */}
        <Card className="p-6 bg-gradient-to-br from-violet-900/40 to-purple-900/40 border-violet-500/30 mb-8 max-w-md mx-auto">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">Your Balance</p>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-8 h-8 text-yellow-400" />
              <span className="text-4xl font-bold text-white">
                {(user?.pointBalance || 0).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-2">points</p>
          </div>
        </Card>

        {/* Packages Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Choose a Package</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 bg-gray-900 border-gray-800 animate-pulse">
                  <div className="h-8 bg-gray-800 rounded mb-4" />
                  <div className="h-12 bg-gray-800 rounded mb-4" />
                  <div className="h-10 bg-gray-800 rounded" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={cn(
                    "p-6 border transition-all duration-200 cursor-pointer hover:scale-[1.02]",
                    pkg.isPopular
                      ? "bg-gradient-to-br from-violet-900/60 to-purple-900/60 border-violet-500/50"
                      : pkg.isBestValue
                      ? "bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/50"
                      : "bg-gray-900 border-gray-800 hover:border-gray-700"
                  )}
                  onClick={() => handlePurchase(pkg)}
                >
                  <div className="relative">
                    {pkg.badgeText && (
                      <Badge className={cn(
                        "absolute -top-3 left-1/2 -translate-x-1/2",
                        pkg.isPopular ? "bg-violet-600" : "bg-gradient-to-r from-yellow-500 to-orange-500"
                      )}>
                        {pkg.badgeText}
                      </Badge>
                    )}

                    <div className="text-center pt-2">
                      <h3 className="text-lg font-semibold text-white mb-1">{pkg.name}</h3>

                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        <span className="text-2xl font-bold text-white">
                          {pkg.points.toLocaleString()}
                        </span>
                      </div>

                      {pkg.bonusPoints > 0 && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/30 border border-green-500/30 rounded-full text-xs text-green-400 mb-3">
                          <TrendingUp className="w-3 h-3" />
                          +{pkg.bonusPoints.toLocaleString()} bonus
                        </div>
                      )}

                      <div className="mt-4">
                        <span className="text-2xl font-bold text-white">${pkg.price.toFixed(2)}</span>
                      </div>

                      <Button
                        className={cn(
                          "w-full mt-4",
                          pkg.isPopular || pkg.isBestValue
                            ? "bg-white text-gray-900 hover:bg-gray-100"
                            : "bg-violet-600 hover:bg-violet-700"
                        )}
                        disabled={isPurchasing && selectedPackage?.id === pkg.id}
                      >
                        {isPurchasing && selectedPackage?.id === pkg.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Purchase
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 bg-gray-900 border-gray-800 text-center">
            <Shield className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-2">Secure Payments</h3>
            <p className="text-sm text-gray-400">
              All transactions are processed securely through Stripe
            </p>
          </Card>
          <Card className="p-6 bg-gray-900 border-gray-800 text-center">
            <Zap className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-2">Instant Delivery</h3>
            <p className="text-sm text-gray-400">
              Points are added to your account immediately
            </p>
          </Card>
          <Card className="p-6 bg-gray-900 border-gray-800 text-center">
            <Gift className="w-10 h-10 text-pink-400 mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-2">Support Creators</h3>
            <p className="text-sm text-gray-400">
              Creators receive a portion of every gift you send
            </p>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
            <Button variant="ghost" size="sm" className="text-gray-400">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <Card className="bg-gray-900 border-gray-800 divide-y divide-gray-800">
            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No transactions yet</p>
                <p className="text-sm text-gray-500">
                  Purchase points to get started!
                </p>
              </div>
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 p-4">
                  <div className="p-2 bg-gray-800 rounded-lg">
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{tx.description}</p>
                    <p className="text-sm text-gray-400">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className={cn(
                    "font-semibold",
                    tx.amount > 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
