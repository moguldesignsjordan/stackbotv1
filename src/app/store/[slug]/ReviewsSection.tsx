// src/app/store/[slug]/ReviewsSection.tsx
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase/config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  where,
} from "firebase/firestore";
import { Star, Send, User, ChevronDown, ChevronUp, AlertCircle, Beaker } from "lucide-react";
///ReviewsSection.tsx] Import the client notification helper
import { 
  notifyVendorNewReviewClient, 
  createNotificationClient 
} from "@/lib/notifications/createNotificationClient";

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Timestamp;
}

interface ReviewsSectionProps {
  vendorId: string;
  vendorName: string;
}

export default function ReviewsSection({ vendorId, vendorName }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debug State
  const [showDebug, setShowDebug] = useState(false);
  
  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsRef = collection(db, "vendors", vendorId, "reviews");
        const q = query(reviewsRef, orderBy("createdAt", "desc"), limit(50));
        const snap = await getDocs(q);
        
        const reviewsData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Review[];
        
        setReviews(reviewsData);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [vendorId]);

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Rating distribution
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage: reviews.length > 0
      ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
      : 0,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in to leave a review");
      return;
    }

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    if (comment.trim().length < 10) {
      setError("Please write at least 10 characters");
      return;
    }

    setSubmitting(true);

    try {
      // Check if user already reviewed
      const existingReviewQuery = query(
        collection(db, "vendors", vendorId, "reviews"),
        where("userId", "==", user.uid)
      );
      const existingSnap = await getDocs(existingReviewQuery);
      
      if (!existingSnap.empty) {
        setError("You have already reviewed this store");
        setSubmitting(false);
        return;
      }

      // Add new review
      const reviewData = {
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Customer",
        rating,
        comment: comment.trim(),
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(db, "vendors", vendorId, "reviews"),
        reviewData
      );

      // Trigger Notification
      try {
        await notifyVendorNewReviewClient({
          vendorId,
          reviewerName: reviewData.userName,
          rating: reviewData.rating,
          comment: reviewData.comment,
        });
        console.log("✅ Review notification sent");
      } catch (notifErr) {
        console.error("❌ Failed to send review notification:", notifErr);
      }

      // Add to local state
      setReviews((prev) => [{ id: docRef.id, ...reviewData }, ...prev]);
      setRating(0);
      setComment("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      console.error("Error submitting review:", err);
      setError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  ///ReviewsSection.tsx] DEBUG: Test Order Flow Notifications
  const handleTestNotification = async (type: string) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login first");
      return;
    }

    try {
      if (type === 'new_order') {
        // Simulate sending "New Order" to VENDOR
        await createNotificationClient({
          userId: vendorId, // Send to Vendor
          type: 'order_placed',
          title: 'New Order Received',
          message: 'TEST: Customer placed an order for $45.00 (3 items)',
          priority: 'high',
          data: {
            orderId: 'test-order-123',
            vendorId: vendorId,
            customerId: user.uid,
            url: `/vendor/orders/test-order-123`,
          }
        });
        alert(`✅ Sent "New Order" to Vendor (${vendorId})`);
      } 
      else if (type === 'order_confirmed') {
        // Simulate sending "Order Confirmed" to CUSTOMER (You)
        await createNotificationClient({
          userId: user.uid, // Send to You
          type: 'order_confirmed',
          title: 'Order Confirmed',
          message: `TEST: Your order from ${vendorName} has been confirmed`,
          priority: 'normal',
          data: {
            orderId: 'test-order-123',
            vendorName: vendorName,
            status: 'confirmed',
            url: `/account/orders/test-order-123`,
          }
        });
        alert("✅ Sent " + type + " to You (Customer)");
      }
      else if (type === 'order_delivered') {
        // Simulate sending "Order Delivered" to CUSTOMER (You)
        await createNotificationClient({
          userId: user.uid,
          type: 'order_delivered',
          title: 'Order Delivered',
          message: `TEST: Your order from ${vendorName} has been delivered`,
          priority: 'normal',
          data: {
            orderId: 'test-order-123',
            vendorName: vendorName,
            status: 'delivered',
            url: `/account/orders/test-order-123`,
          }
        });
        alert("✅ Sent " + type + " to You (Customer)");
      }
    } catch (err) {
      console.error("Test failed:", err);
      alert("❌ Test failed. Check console.");
    }
  };

  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
          <p className="text-gray-500 text-sm mt-1">
            {reviews.length} review{reviews.length !== 1 ? "s" : ""} for {vendorName}
          </p>
        </div>
        
        {reviews.length > 0 && (
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl">
            <div className="text-3xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Based on {reviews.length} reviews
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rating Distribution */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Rating Breakdown</h3>
          <div className="space-y-2">
            {ratingCounts.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-12">{star} star</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write a Review */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Write a Review</h3>
        
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-green-600 fill-green-600" />
            </div>
            <p className="text-green-600 font-medium">Thank you for your review!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Star Rating Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Very Good"}
                    {rating === 5 && "Excellent"}
                  </span>
                )}
              </div>
            </div>

            {/* Comment Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this store..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition-all resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {comment.length}/500 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#55529d] text-white rounded-xl font-medium hover:bg-[#444287] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Review
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#55529d]/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-[#55529d]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{review.userName}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-4 text-gray-700 leading-relaxed">{review.comment}</p>
            </div>
          ))}

          {/* Show More/Less */}
          {reviews.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full flex items-center justify-center gap-2 py-3 text-[#55529d] font-medium hover:bg-[#55529d]/5 rounded-xl transition-colors"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show All {reviews.length} Reviews
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/*/ReviewsSection.tsx] NOTIFICATION DEBUGGER (Dev Only) */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <Beaker className="w-4 h-4" />
          {showDebug ? 'Hide' : 'Show'} Notification Debugger
        </button>

        {showDebug && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-2">Simulate Order Flow</h4>
            <p className="text-sm text-gray-500 mb-4">
              Click these to test if notifications are working without paying real money.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleTestNotification('new_order')}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                1. Simulate "New Order" (To Vendor)
              </button>
              
              <button
                onClick={() => handleTestNotification('order_confirmed')}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
              >
                2. Simulate "Confirmed" (To Customer)
              </button>
              
              <button
                onClick={() => handleTestNotification('order_delivered')}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
              >
                3. Simulate "Delivered" (To Customer)
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mt-3">
              * Note: "New Order" sends to <b>{vendorName}</b> (ID: {vendorId}). <br/>
              * "Confirmed/Delivered" sends to <b>You</b> (Current User).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}