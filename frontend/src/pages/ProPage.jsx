import { useState } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { 
  Crown, Upload, Video, FileText, CheckCircle, Star, 
  Zap, Shield, Trophy, Camera, X, Lock, CreditCard 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { PaymentForm, CreditCard as SquareCreditCard } from "react-square-web-payments-sdk";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

// PRO membership tiers
const PRO_TIERS = [
  {
    id: "fighter",
    name: "Fighter",
    price: 9.99,
    period: "month",
    features: [
      "PRO badge on profile",
      "Access to PRO fighter feed",
      "Priority support",
      "Ad-free experience",
    ],
    color: "from-gray-600 to-gray-800",
  },
  {
    id: "champion",
    name: "Champion",
    price: 19.99,
    period: "month",
    features: [
      "Everything in Fighter",
      "Sponsorship enrollment",
      "Document verification",
      "Featured in discover",
      "Analytics dashboard",
    ],
    color: "from-fight-red to-red-800",
    popular: true,
  },
  {
    id: "legend",
    name: "Legend",
    price: 49.99,
    period: "month",
    features: [
      "Everything in Champion",
      "1-on-1 promotion support",
      "Custom profile themes",
      "Exclusive events access",
      "Merchandise discounts",
      "Direct sponsor connections",
    ],
    color: "from-yellow-600 to-yellow-800",
  },
];

// Sample PRO feed posts
const PRO_FEED_POSTS = [
  {
    id: "pro1",
    username: "ChampionMike",
    user_photo: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=100",
    caption: "Just signed with a major sponsor! PRO membership got me noticed. Training camp starts next week for the title fight! 🏆",
    media_url: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800",
    media_type: "image",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    verified: true,
    tier: "Legend",
  },
  {
    id: "pro2",
    username: "SarahKnockout",
    user_photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    caption: "Exclusive sparring footage from today's session. Working on my combinations for the upcoming bout. Let's go! 💪",
    media_url: "https://images.unsplash.com/photo-1517438322307-e67111335449?w=800",
    media_type: "image",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    verified: true,
    tier: "Champion",
  },
  {
    id: "pro3",
    username: "IronFistJake",
    user_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    caption: "Behind the scenes at today's photoshoot. New gear dropping soon through my sponsor! PRO members get early access.",
    media_url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800",
    media_type: "image",
    created_at: new Date(Date.now() - 14400000).toISOString(),
    verified: true,
    tier: "Champion",
  },
];

// Document types for enrollment
const DOCUMENT_TYPES = [
  { id: "id", name: "Government ID", required: true },
  { id: "medical", name: "Medical Clearance", required: true },
  { id: "record", name: "Fight Record", required: false },
  { id: "license", name: "Fighting License", required: false },
  { id: "gym", name: "Gym Affiliation Letter", required: false },
];

export default function ProPage() {
  const { user } = useAuth();
  const [isPro, setIsPro] = useState(false); // Check from user data in real implementation
  const [selectedTier, setSelectedTier] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [verificationVideo, setVerificationVideo] = useState(null);
  const [enrollmentBio, setEnrollmentBio] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");

  const paypalClientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;
  const squareAppId = process.env.REACT_APP_SQUARE_APP_ID;
  const squareLocationId = process.env.REACT_APP_SQUARE_LOCATION_ID;

  const hasPayPal = paypalClientId && paypalClientId !== "YOUR_PAYPAL_CLIENT_ID";
  const hasSquare = squareAppId && squareAppId !== "YOUR_SQUARE_APP_ID";

  const handleUpgrade = (tier) => {
    setSelectedTier(tier);
    setShowUpgradeModal(true);
  };

  const handleSquarePayment = async (token, verifiedBuyer) => {
    try {
      const response = await fetch(`${API_BASE}/api/payments/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: token.token,
          amount: Math.round(selectedTier.price * 100),
          tierId: selectedTier.id,
          userId: user?.id,
        }),
      });

      if (response.ok) {
        setIsPro(true);
        setShowUpgradeModal(false);
        toast.success(`Welcome to FightNet PRO ${selectedTier.name}! 🏆`);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Payment failed");
      }
    } catch (error) {
      toast.error("Payment processing error");
    }
  };

  const handlePayPalApprove = async (data, actions) => {
    try {
      const details = await actions.order.capture();
      setIsPro(true);
      setShowUpgradeModal(false);
      toast.success(`Welcome to FightNet PRO ${selectedTier.name}! 🏆`);
    } catch (error) {
      toast.error("PayPal payment failed");
    }
  };

  const handleConfirmUpgrade = () => {
    // Fallback for demo mode
    setIsPro(true);
    setShowUpgradeModal(false);
    toast.success(`Welcome to FightNet PRO ${selectedTier.name}! 🏆`);
  };

  const handleDocUpload = (docType, file) => {
    setUploadedDocs({ ...uploadedDocs, [docType]: file });
    toast.success(`${docType} uploaded successfully`);
  };

  const handleVideoUpload = (file) => {
    setVerificationVideo(file);
    toast.success("Verification video uploaded");
  };

  const handleSubmitEnrollment = () => {
    // Validate required documents
    const requiredDocs = DOCUMENT_TYPES.filter(d => d.required);
    const missingDocs = requiredDocs.filter(d => !uploadedDocs[d.id]);
    
    if (missingDocs.length > 0) {
      toast.error(`Please upload required documents: ${missingDocs.map(d => d.name).join(", ")}`);
      return;
    }

    if (!verificationVideo) {
      toast.error("Please upload a verification video");
      return;
    }

    toast.success("Sponsorship enrollment submitted! We'll review your application within 48 hours.");
    setShowEnrollmentModal(false);
  };

  const getAvatarUrl = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http")) return photoUrl;
    return `${API_BASE}${photoUrl}`;
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case "Legend":
        return <Crown size={14} className="text-yellow-500" />;
      case "Champion":
        return <Trophy size={14} className="text-fight-red" />;
      default:
        return <Star size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6" data-testid="pro-container">
      {/* PRO Header */}
      <div className="bg-gradient-to-r from-fight-red/20 to-yellow-600/20 border border-fight-red/30 rounded-sm p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-fight-black/50" />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown size={40} className="text-yellow-500" />
            <h1 className="font-anton text-5xl text-white uppercase tracking-wide">
              FIGHTNET PRO
            </h1>
          </div>
          <p className="text-gray-300 font-barlow max-w-2xl mx-auto text-lg">
            Unlock premium features, get noticed by sponsors, and join the elite fighter community.
          </p>
        </div>
      </div>

      <Tabs defaultValue={isPro ? "feed" : "plans"} className="w-full">
        <TabsList className="w-full bg-fight-charcoal border border-fight-concrete rounded-sm p-1 grid grid-cols-4">
          <TabsTrigger
            value="plans"
            className="font-barlow uppercase tracking-wider data-[state=active]:bg-fight-red data-[state=active]:text-white"
            data-testid="tab-plans"
          >
            Plans
          </TabsTrigger>
          <TabsTrigger
            value="feed"
            className="font-barlow uppercase tracking-wider data-[state=active]:bg-fight-red data-[state=active]:text-white"
            data-testid="tab-feed"
          >
            PRO Feed
          </TabsTrigger>
          <TabsTrigger
            value="enrollment"
            className="font-barlow uppercase tracking-wider data-[state=active]:bg-fight-red data-[state=active]:text-white"
            data-testid="tab-enrollment"
          >
            Sponsorship
          </TabsTrigger>
          <TabsTrigger
            value="benefits"
            className="font-barlow uppercase tracking-wider data-[state=active]:bg-fight-red data-[state=active]:text-white"
            data-testid="tab-benefits"
          >
            Benefits
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-6">
          <div className="grid md:grid-cols-3 gap-6">
            {PRO_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`relative bg-fight-charcoal border rounded-sm overflow-hidden ${
                  tier.popular ? "border-fight-red" : "border-fight-concrete"
                }`}
                data-testid={`tier-${tier.id}`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-fight-red text-white text-xs font-barlow uppercase px-3 py-1">
                    Most Popular
                  </div>
                )}
                
                <div className={`h-2 bg-gradient-to-r ${tier.color}`} />
                
                <div className="p-6">
                  <h3 className="font-anton text-2xl text-white uppercase">{tier.name}</h3>
                  <div className="mt-4">
                    <span className="font-anton text-4xl text-white">${tier.price}</span>
                    <span className="text-gray-500 font-barlow">/{tier.period}</span>
                  </div>
                  
                  <ul className="mt-6 space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-300 font-barlow text-sm">
                        <CheckCircle size={16} className="text-fight-red flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    onClick={() => handleUpgrade(tier)}
                    className={`w-full mt-6 font-barlow font-bold uppercase tracking-wider ${
                      tier.popular
                        ? "bg-fight-red hover:bg-red-700 text-white"
                        : "bg-fight-concrete hover:bg-gray-700 text-white"
                    }`}
                    data-testid={`upgrade-${tier.id}`}
                  >
                    {isPro ? "Current Plan" : "Upgrade Now"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* PRO Feed Tab */}
        <TabsContent value="feed" className="mt-6">
          {isPro ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-anton text-xl text-white uppercase tracking-wide flex items-center gap-2">
                  <Zap size={20} className="text-yellow-500" />
                  EXCLUSIVE PRO CONTENT
                </h2>
              </div>
              
              {PRO_FEED_POSTS.map((post) => (
                <div
                  key={post.id}
                  className="bg-fight-charcoal border border-fight-concrete rounded-sm overflow-hidden"
                  data-testid={`pro-post-${post.id}`}
                >
                  <div className="p-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-yellow-500">
                      <AvatarImage src={post.user_photo} />
                      <AvatarFallback className="bg-fight-black text-fight-red font-anton">
                        {post.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-barlow font-semibold text-white">{post.username}</span>
                        {post.verified && <CheckCircle size={14} className="text-blue-500" />}
                        {getTierBadge(post.tier)}
                        <span className="text-xs text-yellow-500 font-barlow uppercase">{post.tier}</span>
                      </div>
                      <span className="text-gray-500 text-sm font-barlow">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <p className="px-4 pb-4 text-gray-200 font-barlow">{post.caption}</p>
                  
                  {post.media_url && (
                    <img
                      src={post.media_url}
                      alt=""
                      className="w-full"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-fight-charcoal border border-fight-concrete rounded-sm p-12 text-center">
              <Lock size={64} className="mx-auto text-gray-600 mb-4" />
              <h3 className="font-anton text-2xl text-white uppercase mb-2">
                PRO MEMBERS ONLY
              </h3>
              <p className="text-gray-400 font-barlow mb-6 max-w-md mx-auto">
                Upgrade to PRO to access exclusive content from verified fighters, behind-the-scenes footage, and sponsorship opportunities.
              </p>
              <Button
                onClick={() => handleUpgrade(PRO_TIERS[1])}
                className="bg-fight-red hover:bg-red-700 text-white font-barlow font-bold uppercase"
              >
                <Crown size={18} className="mr-2" />
                Unlock PRO Feed
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Sponsorship Enrollment Tab */}
        <TabsContent value="enrollment" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-fight-charcoal border border-fight-concrete rounded-sm p-6">
              <h2 className="font-anton text-xl text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                <Shield size={20} className="text-fight-red" />
                SPONSORSHIP ENROLLMENT
              </h2>
              <p className="text-gray-400 font-barlow mb-6">
                Submit your documents and verification video to be considered for sponsorship opportunities with top brands.
              </p>

              {isPro ? (
                <div className="space-y-4">
                  {/* Document Uploads */}
                  {DOCUMENT_TYPES.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-fight-black rounded-sm">
                      <div className="flex items-center gap-3">
                        <FileText size={20} className={uploadedDocs[doc.id] ? "text-green-500" : "text-gray-500"} />
                        <div>
                          <span className="text-white font-barlow text-sm">{doc.name}</span>
                          {doc.required && <span className="text-fight-red text-xs ml-2">*Required</span>}
                        </div>
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleDocUpload(doc.id, e.target.files[0])}
                        />
                        <span className={`px-3 py-1 rounded-sm text-xs font-barlow uppercase ${
                          uploadedDocs[doc.id]
                            ? "bg-green-900/30 text-green-500"
                            : "bg-fight-concrete text-white hover:bg-gray-600"
                        }`}>
                          {uploadedDocs[doc.id] ? "Uploaded" : "Upload"}
                        </span>
                      </label>
                    </div>
                  ))}

                  {/* Verification Video */}
                  <div className="p-4 bg-fight-black rounded-sm border-2 border-dashed border-fight-concrete">
                    <div className="flex items-center gap-3 mb-3">
                      <Video size={24} className={verificationVideo ? "text-green-500" : "text-fight-red"} />
                      <div>
                        <span className="text-white font-barlow">Verification Video</span>
                        <span className="text-fight-red text-xs ml-2">*Required</span>
                      </div>
                    </div>
                    <p className="text-gray-500 font-barlow text-sm mb-3">
                      Record a 30-60 second video introducing yourself and demonstrating your skills.
                    </p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => handleVideoUpload(e.target.files[0])}
                      />
                      <Button variant="outline" className="border-fight-concrete text-white hover:bg-fight-concrete">
                        <Camera size={18} className="mr-2" />
                        {verificationVideo ? "Change Video" : "Upload Video"}
                      </Button>
                    </label>
                    {verificationVideo && (
                      <span className="text-green-500 text-sm ml-3">{verificationVideo.name}</span>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label className="text-gray-400 font-barlow uppercase text-xs">Fighter Bio</Label>
                    <Textarea
                      value={enrollmentBio}
                      onChange={(e) => setEnrollmentBio(e.target.value)}
                      placeholder="Tell sponsors about yourself, your achievements, and goals..."
                      className="bg-fight-black border-fight-concrete text-white resize-none"
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleSubmitEnrollment}
                    className="w-full bg-fight-red hover:bg-red-700 text-white font-barlow font-bold uppercase"
                  >
                    Submit for Review
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lock size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400 font-barlow mb-4">
                    Upgrade to Champion or Legend tier to access sponsorship enrollment.
                  </p>
                  <Button
                    onClick={() => handleUpgrade(PRO_TIERS[1])}
                    className="bg-fight-red hover:bg-red-700 text-white font-barlow uppercase"
                  >
                    Upgrade to Champion
                  </Button>
                </div>
              )}
            </div>

            {/* Sponsorship Info */}
            <div className="space-y-4">
              <div className="bg-fight-charcoal border border-fight-concrete rounded-sm p-6">
                <h3 className="font-anton text-lg text-white uppercase mb-4">HOW IT WORKS</h3>
                <ol className="space-y-4">
                  {[
                    "Submit your documents and verification video",
                    "Our team reviews your application within 48 hours",
                    "Get matched with sponsors looking for fighters like you",
                    "Negotiate deals and grow your brand",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-fight-red text-white text-sm flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-gray-300 font-barlow">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-gradient-to-br from-yellow-600/20 to-fight-red/20 border border-yellow-600/30 rounded-sm p-6">
                <h3 className="font-anton text-lg text-yellow-500 uppercase mb-2">
                  SPONSOR SPOTLIGHT
                </h3>
                <p className="text-gray-300 font-barlow text-sm">
                  Our PRO fighters have been sponsored by leading brands in combat sports gear, supplements, and apparel. Join the elite and get noticed!
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Benefits Tab */}
        <TabsContent value="benefits" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Crown, title: "PRO Badge", desc: "Stand out with a verified PRO badge on your profile" },
              { icon: Zap, title: "Exclusive Feed", desc: "Access content from verified professional fighters" },
              { icon: Shield, title: "Sponsorship Access", desc: "Get noticed by top brands and sponsors" },
              { icon: Trophy, title: "Featured Placement", desc: "Get featured in the discover section" },
              { icon: Star, title: "Priority Support", desc: "24/7 dedicated support for PRO members" },
              { icon: FileText, title: "Analytics", desc: "Track your profile views and engagement" },
            ].map((benefit, i) => (
              <div
                key={i}
                className="bg-fight-charcoal border border-fight-concrete rounded-sm p-6 hover:border-fight-red transition-colors"
              >
                <benefit.icon size={32} className="text-fight-red mb-4" />
                <h3 className="font-anton text-lg text-white uppercase mb-2">{benefit.title}</h3>
                <p className="text-gray-400 font-barlow text-sm">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-fight-charcoal border-fight-concrete max-w-md">
          <DialogHeader>
            <DialogTitle className="font-anton text-2xl text-white uppercase">
              Upgrade to {selectedTier?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTier && (
            <div className="space-y-4 mt-4">
              <div className="text-center py-4">
                <span className="font-anton text-5xl text-white">${selectedTier.price}</span>
                <span className="text-gray-500 font-barlow">/{selectedTier.period}</span>
              </div>
              
              <ul className="space-y-2">
                {selectedTier.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-300 font-barlow text-sm">
                    <CheckCircle size={16} className="text-fight-red" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Payment Methods */}
              <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                <TabsList className="w-full bg-fight-black border border-fight-concrete rounded-sm p-1 grid grid-cols-3">
                  <TabsTrigger
                    value="card"
                    className="font-barlow text-xs uppercase data-[state=active]:bg-fight-red data-[state=active]:text-white"
                  >
                    Card
                  </TabsTrigger>
                  <TabsTrigger
                    value="paypal"
                    className="font-barlow text-xs uppercase data-[state=active]:bg-fight-red data-[state=active]:text-white"
                  >
                    PayPal
                  </TabsTrigger>
                  <TabsTrigger
                    value="cashapp"
                    className="font-barlow text-xs uppercase data-[state=active]:bg-fight-red data-[state=active]:text-white"
                  >
                    Cash App
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="card" className="mt-4">
                  {hasSquare ? (
                    <PaymentForm
                      applicationId={squareAppId}
                      locationId={squareLocationId}
                      cardTokenizeResponseReceived={handleSquarePayment}
                    >
                      <SquareCreditCard
                        buttonProps={{
                          css: {
                            backgroundColor: "#dc2626",
                            fontSize: "14px",
                            color: "#fff",
                            fontFamily: "Barlow, sans-serif",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            padding: "14px 24px",
                            "&:hover": { backgroundColor: "#b91c1c" },
                          },
                        }}
                      />
                    </PaymentForm>
                  ) : (
                    <Button
                      onClick={handleConfirmUpgrade}
                      className="w-full bg-fight-red hover:bg-red-700 text-white font-barlow font-bold uppercase h-12"
                    >
                      <CreditCard size={18} className="mr-2" />
                      Subscribe ${selectedTier.price}/mo (Demo)
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="paypal" className="mt-4">
                  {hasPayPal ? (
                    <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD", vault: true, intent: "subscription" }}>
                      <PayPalButtons
                        style={{ layout: "vertical", color: "black", shape: "rect" }}
                        createOrder={(data, actions) => {
                          return actions.order.create({
                            purchase_units: [{
                              amount: { value: selectedTier.price.toFixed(2), currency_code: "USD" },
                              description: `FightNet PRO ${selectedTier.name} Subscription`,
                            }],
                          });
                        }}
                        onApprove={handlePayPalApprove}
                        onError={(err) => toast.error("PayPal error")}
                      />
                    </PayPalScriptProvider>
                  ) : (
                    <Button
                      onClick={handleConfirmUpgrade}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-barlow font-bold uppercase h-12"
                    >
                      PayPal (Demo)
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="cashapp" className="mt-4">
                  {hasSquare ? (
                    <PaymentForm
                      applicationId={squareAppId}
                      locationId={squareLocationId}
                      cardTokenizeResponseReceived={handleSquarePayment}
                    >
                      <SquareCreditCard
                        buttonProps={{
                          css: {
                            backgroundColor: "#00D632",
                            fontSize: "14px",
                            color: "#fff",
                            fontFamily: "Barlow, sans-serif",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            padding: "14px 24px",
                            "&:hover": { backgroundColor: "#00B82B" },
                          },
                        }}
                      />
                    </PaymentForm>
                  ) : (
                    <Button
                      onClick={handleConfirmUpgrade}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-barlow font-bold uppercase h-12"
                    >
                      Cash App (Demo)
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
              
              <p className="text-gray-600 font-barlow text-xs text-center">
                Secure payments via PayPal & Square. Cancel anytime.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Owner Note */}
      <div className="bg-fight-black border border-fight-concrete rounded-sm p-6">
        <h3 className="font-anton text-lg text-fight-red uppercase tracking-wide mb-2">
          OWNER NOTE
        </h3>
        <p className="text-gray-400 font-barlow text-sm">
          To enable payments, integrate Stripe Subscriptions in <code className="text-fight-red bg-fight-charcoal px-2 py-1 rounded">handleConfirmUpgrade</code>. 
          PRO status should be stored in the user database and checked on login. 
          Document uploads should be sent to your backend for storage and review.
        </p>
      </div>
    </div>
  );
}
