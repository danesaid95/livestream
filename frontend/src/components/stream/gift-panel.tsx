"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Sparkles, Heart, Star, Crown, Gem, Rocket, Gift as GiftIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { giftsApi } from "@/lib/api";

interface Gift {
  id: string;
  name: string;
  iconUrl: string | null;
  pointCost: number;
  tier: string;
}

interface GiftPanelProps {
  streamId: string;
  receiverId: string;
  isOpen: boolean;
  onClose: () => void;
  onGiftSent?: (gift: Gift, amount: number) => void;
}

const giftIcons: Record<string, React.ReactNode> = {
  heart: <Heart className="w-8 h-8" />,
  star: <Star className="w-8 h-8" />,
  sparkles: <Sparkles className="w-8 h-8" />,
  crown: <Crown className="w-8 h-8" />,
  gem: <Gem className="w-8 h-8" />,
  rocket: <Rocket className="w-8 h-8" />,
  default: <GiftIcon className="w-8 h-8" />,
};

const giftColors: Record<string, string> = {
  basic: "from-gray-500 to-gray-600",
  standard: "from-violet-500 to-purple-600",
  premium: "from-cyan-400 to-blue-500",
  legendary: "from-yellow-500 to-orange-500",
  default: "from-gray-500 to-gray-600",
};

const tierColors: Record<string, string> = {
  basic: "text-gray-400",
  standard: "text-violet-400",
  premium: "text-cyan-400",
  legendary: "text-yellow-400",
};

export function GiftPanel({ streamId, receiverId, isOpen, onClose, onGiftSent }: GiftPanelProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [amount, setAmount] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGifts = async () => {
      try {
        const response = await giftsApi.list();
        setGifts(response.data.data || []);
      } catch (error) {
        console.error("Failed to fetch gifts:", error);
        // Use mock gifts for demo
        setGifts([
          { id: "1", name: "Heart", iconUrl: null, pointCost: 10, tier: "basic" },
          { id: "2", name: "Star", iconUrl: null, pointCost: 50, tier: "basic" },
          { id: "3", name: "Sparkles", iconUrl: null, pointCost: 100, tier: "standard" },
          { id: "4", name: "Crown", iconUrl: null, pointCost: 500, tier: "standard" },
          { id: "5", name: "Gem", iconUrl: null, pointCost: 1000, tier: "premium" },
          { id: "6", name: "Rocket", iconUrl: null, pointCost: 5000, tier: "legendary" },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchGifts();
    }
  }, [isOpen]);

  const handleSendGift = async () => {
    if (!selectedGift || !isAuthenticated || isSending || !receiverId) return;

    const totalCost = selectedGift.pointCost * amount;
    if ((user?.pointBalance || 0) < totalCost) {
      alert("Not enough points! Purchase more points to send this gift.");
      return;
    }

    setIsSending(true);
    try {
      await giftsApi.sendToUser({
        giftId: selectedGift.id,
        receiverId,
        streamId,
        quantity: amount,
      });
      onGiftSent?.(selectedGift, amount);
      setSelectedGift(null);
      setAmount(1);
      onClose();
    } catch (error) {
      console.error("Failed to send gift:", error);
      alert("Failed to send gift. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <GiftIcon className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold text-white">Send a Gift</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Points Balance */}
        {isAuthenticated && (
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Your Points</span>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-yellow-400">
                  {(user?.pointBalance || 0).toLocaleString()}
                </span>
                <a
                  href="/points"
                  className="ml-2 text-xs text-violet-400 hover:underline"
                >
                  Get more
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Gifts Grid */}
        <div className="p-4 overflow-y-auto max-h-[40vh]">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-gray-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {gifts.map((gift) => {
                const tier = gift.tier || "basic";
                const isSelected = selectedGift?.id === gift.id;
                // Use iconUrl if it's an emoji, otherwise use default icon
                const isEmoji = gift.iconUrl && /^\p{Emoji}/u.test(gift.iconUrl);

                return (
                  <button
                    key={gift.id}
                    onClick={() => setSelectedGift(gift)}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200",
                      isSelected
                        ? "bg-gradient-to-br " + (giftColors[tier] || giftColors.default) + " scale-105 shadow-lg"
                        : "bg-gray-800 hover:bg-gray-700"
                    )}
                  >
                    <div className={cn(
                      "mb-2 text-2xl",
                      isSelected ? "text-white" : tierColors[tier] || "text-gray-400"
                    )}>
                      {isEmoji ? gift.iconUrl : giftIcons.default}
                    </div>
                    <span className="text-xs font-medium text-white truncate w-full text-center">
                      {gift.name}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs text-yellow-400">
                        {gift.pointCost}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Amount Selector */}
        {selectedGift && (
          <div className="px-4 py-3 border-t border-gray-800 bg-gray-800/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Amount</span>
              <div className="flex items-center gap-2">
                {[1, 5, 10, 50].map((num) => (
                  <button
                    key={num}
                    onClick={() => setAmount(num)}
                    className={cn(
                      "px-3 py-1 text-sm rounded-full transition-colors",
                      amount === num
                        ? "bg-violet-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Total Cost</span>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-yellow-400">
                  {(selectedGift.pointCost * amount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Send Button */}
        <div className="p-4 border-t border-gray-800">
          {!isAuthenticated ? (
            <Link href="/auth/login" className={cn(buttonVariants(), "w-full")}>
              Log in to Send Gifts
            </Link>
          ) : (
            <Button
              onClick={handleSendGift}
              disabled={!selectedGift || isSending}
              className="w-full bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700"
            >
              {isSending ? (
                "Sending..."
              ) : selectedGift ? (
                <>
                  <GiftIcon className="w-4 h-4 mr-2" />
                  Send {selectedGift.name} x{amount}
                </>
              ) : (
                "Select a Gift"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
