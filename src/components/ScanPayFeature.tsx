import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, X, Check, CreditCard, Smartphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ScanPayFeatureProps {
  onExpenseAdded?: (expense: any) => void;
}

export const ScanPayFeature = ({ onExpenseAdded }: ScanPayFeatureProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateReceiptScan = () => {
    setIsScanning(true);
    
    // Simulate processing time
    setTimeout(() => {
      const mockReceiptData = {
        merchant: "Coffee Bean Cafe",
        amount: 15.47,
        items: [
          { name: "Latte", price: 5.50 },
          { name: "Blueberry Muffin", price: 3.25 },
          { name: "Sandwich", price: 6.72 }
        ],
        date: new Date().toISOString().split('T')[0],
        category: "Food & Dining"
      };
      
      setScannedData(mockReceiptData);
      setIsScanning(false);
      toast({
        title: "Receipt Scanned",
        description: "Receipt processed successfully",
      });
    }, 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      simulateReceiptScan();
    }
  };

  const confirmExpense = () => {
    if (scannedData && onExpenseAdded) {
      onExpenseAdded({
        amount: scannedData.amount,
        category: scannedData.category,
        description: `${scannedData.merchant} - Receipt`,
        date: scannedData.date
      });
    }
    setScannedData(null);
    toast({
      title: "Expense Added",
      description: "Scanned expense added to your tracker",
    });
  };

  const initiatePayment = () => {
    setShowPayment(true);
    
    // Simulate payment processing
    setTimeout(() => {
      toast({
        title: "Payment Successful",
        description: "Payment processed and expense added automatically",
      });
      setShowPayment(false);
      
      if (onExpenseAdded) {
        onExpenseAdded({
          amount: 25.99,
          category: "Shopping",
          description: "Quick Pay Transaction",
          date: new Date().toISOString().split('T')[0]
        });
      }
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Scan Receipt Section */}
      <Card className="p-6 bg-gradient-to-br from-accent/5 to-accent/10">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-accent/20 rounded-full">
            <Camera className="h-8 w-8 text-accent" />
          </div>
          <h3 className="text-xl font-semibold">Scan Receipt</h3>
          <p className="text-muted-foreground">
            Quickly add expenses by scanning your receipts
          </p>
          
          <div className="flex gap-3 justify-center">
            <Button
              onClick={simulateReceiptScan}
              disabled={isScanning}
              className="bg-accent hover:bg-accent/90"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isScanning ? "Scanning..." : "Open Camera"}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </Card>

      {/* Quick Pay Section */}
      <Card className="p-6 bg-gradient-to-br from-secondary/5 to-secondary/10">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-secondary/20 rounded-full">
            <CreditCard className="h-8 w-8 text-secondary" />
          </div>
          <h3 className="text-xl font-semibold">Quick Pay</h3>
          <p className="text-muted-foreground">
            Make payments and automatically track expenses
          </p>
          
          <div className="flex gap-3 justify-center">
            <Button
              onClick={initiatePayment}
              disabled={showPayment}
              className="bg-secondary hover:bg-secondary/90"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {showPayment ? "Processing..." : "Pay Now"}
            </Button>
            
            <Button variant="outline">
              <Smartphone className="h-4 w-4 mr-2" />
              NFC Pay
            </Button>
          </div>
        </div>
      </Card>

      {/* Scanned Receipt Dialog */}
      <Dialog open={!!scannedData} onOpenChange={() => setScannedData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Scanned Receipt</DialogTitle>
          </DialogHeader>
          
          {scannedData && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-semibold text-lg">{scannedData.merchant}</h4>
                <p className="text-muted-foreground">{scannedData.date}</p>
                
                <div className="mt-3 space-y-1">
                  {scannedData.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span>${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t mt-3 pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${scannedData.amount.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button onClick={confirmExpense} className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
                <Button variant="outline" onClick={() => setScannedData(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Processing Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processing Payment</DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-8">
            <div className="inline-flex p-4 bg-secondary/20 rounded-full animate-pulse">
              <CreditCard className="h-8 w-8 text-secondary" />
            </div>
            <p className="mt-4 text-muted-foreground">
              Please wait while we process your payment...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};