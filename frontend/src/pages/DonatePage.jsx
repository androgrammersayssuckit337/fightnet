import { useState } from "react";
import { Heart, Building2, CreditCard, CheckCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { PaymentForm, CreditCard as SquareCreditCard } from "react-square-web-payments-sdk";

// Donation amounts
const DONATION_AMOUNTS = [5, 10, 25, 50, 100, 250];

// Featured gyms/dojos that accept donations
const FEATURED_GYMS = [
  {
    id: "fightnet",
    name: "FightNet Team (Knockout-Social)",
    description: "Support the FightNet platform development and community initiatives.",
    image: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400",
    type: "Platform",
  },
  {
    id: "gym1",
    name: "Iron Fist Boxing Gym",
    description: "Local boxing gym helping underprivileged youth learn the sweet science.",
    image: "https://images.unsplash.com/photo-1517438322307-e67111335449?w=400",
    type: "Boxing Gym",
  },
  {
    id: "gym2",
    name: "Rising Sun Dojo",
    description: "Traditional martial arts dojo teaching discipline and respect.",
    image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400",
    type: "Dojo",
  },
  {
    id: "gym3",
    name: "Apex MMA Academy",
    description: "Mixed martial arts training center for fighters of all levels.",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400",
    type: "MMA Gym",
  },
];

export default function DonatePage() {
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [donationAmount, setDonationAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorMessage, setDonorMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");

  const paypalClientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;
  const squareAppId = process.env.REACT_APP_SQUARE_APP_ID;
  const squareLocationId = process.env.REACT_APP_SQUARE_LOCATION_ID;

  const hasPayPal = paypalClientId && paypalClientId !== "YOUR_PAYPAL_CLIENT_ID";
  const hasSquare = squareAppId && squareAppId !== "YOUR_SQUARE_APP_ID";

  const handleSelectRecipient = (gym) => {
    setSelectedRecipient(gym);
    setShowSuccess(false);
  };

  const getFinalAmount = () => {
    return customAmount ? parseFloat(customAmount) : donationAmount;
  };

  const handleSquarePayment = async (token, verifiedBuyer) => {
    if (!selectedRecipient) {
      toast.error("Please select a recipient");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/square`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: token.token,
          amount: Math.round(getFinalAmount() * 100),
          recipientId: selectedRecipient.id,
          donorName: isAnonymous ? "Anonymous" : donorName,
          message: donorMessage,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        toast.success(`Thank you for your $${getFinalAmount()} donation!`);
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
      setShowSuccess(true);
      toast.success(`Thank you for your donation, ${details.payer.name.given_name}!`);
    } catch (error) {
      toast.error("PayPal payment failed");
    }
  };

  const handleManualDonate = () => {
    if (!selectedRecipient) {
      toast.error("Please select a gym or organization to donate to");
      return;
    }
    toast.success(`Redirecting to payment... (Demo mode - integrate payment processor)`);
  };

  return (
    <div className="space-y-6" data-testid="donate-container">
      {/* Donate Header */}
      <div className="bg-fight-charcoal border border-fight-concrete rounded-sm p-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Heart size={32} className="text-fight-red" />
          <h1 className="font-anton text-4xl text-white uppercase tracking-wide">
            SUPPORT THE FIGHT
          </h1>
        </div>
        <p className="text-gray-400 font-barlow max-w-xl mx-auto">
          Donate to your local gym, dojo, or support the FightNet community. Every contribution helps fighters train and grow.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recipients List */}
        <div className="space-y-4">
          <h2 className="font-anton text-xl text-white uppercase tracking-wide">
            SELECT RECIPIENT
          </h2>
          
          {FEATURED_GYMS.map((gym) => (
            <div
              key={gym.id}
              onClick={() => handleSelectRecipient(gym)}
              className={`bg-fight-charcoal border rounded-sm p-4 cursor-pointer transition-all ${
                selectedRecipient?.id === gym.id
                  ? "border-fight-red shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                  : "border-fight-concrete hover:border-gray-600"
              }`}
              data-testid={`recipient-${gym.id}`}
            >
              <div className="flex gap-4">
                <img
                  src={gym.image}
                  alt={gym.name}
                  className="w-20 h-20 object-cover rounded-sm"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-barlow font-semibold text-white">
                      {gym.name}
                    </h3>
                    {selectedRecipient?.id === gym.id && (
                      <CheckCircle size={16} className="text-fight-red" />
                    )}
                  </div>
                  <span className="text-xs text-fight-red font-barlow uppercase">
                    {gym.type}
                  </span>
                  <p className="text-gray-500 font-barlow text-sm mt-1">
                    {gym.description}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Custom Gym Input */}
          <div className="bg-fight-black border border-fight-concrete rounded-sm p-4">
            <h3 className="font-barlow font-semibold text-white mb-3">
              Or enter a custom gym/dojo
            </h3>
            <Input
              placeholder="Enter gym name or ID"
              className="bg-fight-charcoal border-fight-concrete text-white"
              data-testid="custom-gym-input"
            />
            <p className="text-gray-600 font-barlow text-xs mt-2">
              Contact the gym to get their FightNet donation ID
            </p>
          </div>
        </div>

        {/* Donation Form */}
        <div className="bg-fight-charcoal border border-fight-concrete rounded-sm p-6">
          {showSuccess ? (
            <div className="text-center py-12">
              <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
              <h3 className="font-anton text-2xl text-white uppercase mb-2">
                THANK YOU!
              </h3>
              <p className="text-gray-400 font-barlow mb-6">
                Your donation to {selectedRecipient?.name} has been received.
              </p>
              <Button
                onClick={() => setShowSuccess(false)}
                className="bg-fight-red hover:bg-red-700 text-white font-barlow uppercase"
              >
                Make Another Donation
              </Button>
            </div>
          ) : (
            <>
              <h2 className="font-anton text-xl text-white uppercase tracking-wide mb-6">
                DONATION DETAILS
              </h2>

              {selectedRecipient && (
                <div className="bg-fight-black rounded-sm p-3 mb-6 flex items-center gap-3">
                  <Building2 size={20} className="text-fight-red" />
                  <span className="text-white font-barlow">
                    Donating to: <strong>{selectedRecipient.name}</strong>
                  </span>
                </div>
              )}

              {/* Amount Selection */}
              <div className="space-y-3 mb-6">
                <Label className="text-gray-400 font-barlow uppercase text-xs tracking-wider">
                  Select Amount
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {DONATION_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setDonationAmount(amount);
                        setCustomAmount("");
                      }}
                      className={`py-3 rounded-sm font-anton text-lg transition-all ${
                        donationAmount === amount && !customAmount
                          ? "bg-fight-red text-white"
                          : "bg-fight-black text-gray-400 border border-fight-concrete hover:border-fight-red"
                      }`}
                      data-testid={`amount-${amount}`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="bg-fight-black border-fight-concrete text-white mt-2"
                  data-testid="custom-amount-input"
                />
              </div>

              {/* Donor Info */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 accent-fight-red"
                  />
                  <Label htmlFor="anonymous" className="text-gray-400 font-barlow">
                    Donate anonymously
                  </Label>
                </div>

                {!isAnonymous && (
                  <div className="space-y-2">
                    <Label className="text-gray-400 font-barlow uppercase text-xs tracking-wider">
                      Your Name (Optional)
                    </Label>
                    <Input
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Fighter Name"
                      className="bg-fight-black border-fight-concrete text-white"
                      data-testid="donor-name-input"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-gray-400 font-barlow uppercase text-xs tracking-wider">
                    Message (Optional)
                  </Label>
                  <Textarea
                    value={donorMessage}
                    onChange={(e) => setDonorMessage(e.target.value)}
                    placeholder="Leave a message of support..."
                    className="bg-fight-black border-fight-concrete text-white resize-none"
                    rows={3}
                    data-testid="donor-message-input"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                <Label className="text-gray-400 font-barlow uppercase text-xs tracking-wider">
                  Payment Method
                </Label>

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

                  {/* Square Card Payment */}
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
                              letterSpacing: "0.05em",
                              padding: "14px 24px",
                              "&:hover": {
                                backgroundColor: "#b91c1c",
                              },
                            },
                          }}
                        />
                      </PaymentForm>
                    ) : (
                      <div className="text-center py-6 bg-fight-black rounded-sm">
                        <CreditCard size={32} className="mx-auto text-gray-600 mb-2" />
                        <p className="text-gray-500 font-barlow text-sm">Square API keys required</p>
                        <a
                          href="https://developer.squareup.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fight-red hover:underline text-xs"
                        >
                          Get Square API Keys →
                        </a>
                        <Button
                          onClick={handleManualDonate}
                          disabled={!selectedRecipient}
                          className="w-full mt-4 bg-fight-red hover:bg-red-700 text-white font-barlow uppercase"
                        >
                          <DollarSign size={18} className="mr-2" />
                          Donate ${getFinalAmount()} (Demo)
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* PayPal Payment */}
                  <TabsContent value="paypal" className="mt-4">
                    {hasPayPal ? (
                      <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD" }}>
                        <PayPalButtons
                          style={{ layout: "vertical", color: "black", shape: "rect" }}
                          disabled={!selectedRecipient}
                          createOrder={(data, actions) => {
                            return actions.order.create({
                              purchase_units: [
                                {
                                  amount: {
                                    value: getFinalAmount().toFixed(2),
                                    currency_code: "USD",
                                  },
                                  description: `Donation to ${selectedRecipient?.name || "FightNet"}`,
                                },
                              ],
                            });
                          }}
                          onApprove={handlePayPalApprove}
                          onError={(err) => toast.error("PayPal error: " + err.message)}
                        />
                      </PayPalScriptProvider>
                    ) : (
                      <div className="text-center py-6 bg-fight-black rounded-sm">
                        <div className="text-2xl mb-2">🅿️</div>
                        <p className="text-gray-500 font-barlow text-sm">PayPal Client ID required</p>
                        <a
                          href="https://developer.paypal.com/dashboard/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fight-red hover:underline text-xs"
                        >
                          Get PayPal Client ID →
                        </a>
                        <Button
                          onClick={handleManualDonate}
                          disabled={!selectedRecipient}
                          className="w-full mt-4 bg-fight-red hover:bg-red-700 text-white font-barlow uppercase"
                        >
                          <DollarSign size={18} className="mr-2" />
                          Donate ${getFinalAmount()} (Demo)
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Cash App (Square) Payment */}
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
                              letterSpacing: "0.05em",
                              padding: "14px 24px",
                              "&:hover": {
                                backgroundColor: "#00B82B",
                              },
                            },
                          }}
                        />
                      </PaymentForm>
                    ) : (
                      <div className="text-center py-6 bg-fight-black rounded-sm">
                        <div className="text-4xl mb-2">💵</div>
                        <p className="text-white font-barlow font-semibold">Cash App / Square</p>
                        <p className="text-gray-500 font-barlow text-sm mt-1">
                          Square API keys required for Cash App payments
                        </p>
                        <a
                          href="https://developer.squareup.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fight-red hover:underline text-xs"
                        >
                          Get Square API Keys →
                        </a>
                        <Button
                          onClick={handleManualDonate}
                          disabled={!selectedRecipient}
                          className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-barlow uppercase"
                        >
                          <DollarSign size={18} className="mr-2" />
                          Donate ${getFinalAmount()} (Demo)
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <p className="text-gray-600 font-barlow text-xs text-center mt-4">
                Secure payment processing powered by Square & PayPal.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Owner Note */}
      <div className="bg-fight-black border border-fight-concrete rounded-sm p-6">
        <h3 className="font-anton text-lg text-fight-red uppercase tracking-wide mb-2">
          SETUP INSTRUCTIONS
        </h3>
        <div className="text-gray-400 font-barlow text-sm space-y-2">
          <p><strong>PayPal:</strong> Add <code className="text-fight-red bg-fight-charcoal px-2 py-1 rounded">REACT_APP_PAYPAL_CLIENT_ID</code> to frontend/.env</p>
          <p><strong>Square/Cash App:</strong> Add <code className="text-fight-red bg-fight-charcoal px-2 py-1 rounded">REACT_APP_SQUARE_APP_ID</code> and <code className="text-fight-red bg-fight-charcoal px-2 py-1 rounded">REACT_APP_SQUARE_LOCATION_ID</code> to frontend/.env</p>
          <p>Get keys at: <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="text-fight-red hover:underline">PayPal</a> | <a href="https://developer.squareup.com" target="_blank" rel="noopener noreferrer" className="text-fight-red hover:underline">Square</a></p>
        </div>
      </div>
    </div>
  );
}
