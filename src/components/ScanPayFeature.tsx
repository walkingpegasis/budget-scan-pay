import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ScanPayFeatureProps {
  onExpenseAdded?: (expense: any) => void;
}

export const ScanPayFeature = ({ onExpenseAdded }: ScanPayFeatureProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { email } = useAuth();

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!email) {
      toast({ title: "Login required", description: "Please sign in to upload bills", variant: "destructive" });
      return;
    }
    try {
      setIsScanning(true);
      const form = new FormData();
      form.append("bill", file);
      form.append("email", email);
      const res = await fetch("/api/bills/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setScannedData(data);
      setAmount(String(data.amount || ""));
      setCategory(String(data.suggested_category || ""));
      setDescription(data.merchant ? `${data.merchant} - Bill` : "Bill");
      toast({ title: "Bill uploaded", description: "Review and categorize your expense" });
    } catch (e: any) {
      toast({ title: "Upload error", description: String(e.message || e), variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  const confirmExpense = async () => {
    if (!email) {
      toast({ title: "Login required", description: "Please sign in", variant: "destructive" });
      return;
    }
    const parsedAmount = parseFloat(amount || "0");
    if (!parsedAmount || !category || !description) {
      toast({ title: "Missing info", description: "Enter amount, category, and description", variant: "destructive" });
      return;
    }
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: parsedAmount,
          category,
          description,
          date: (scannedData?.date) || new Date().toISOString().split("T")[0]
        })
      });
      if (onExpenseAdded) {
        onExpenseAdded({ amount: parsedAmount, category, description, date: scannedData?.date });
      }
      toast({ title: "Expense added", description: "Saved from bill" });
      setScannedData(null);
      setCategory("");
      setAmount("");
      setDescription("");
    } catch (e: any) {
      toast({ title: "Save error", description: String(e.message || e), variant: "destructive" });
    }
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

      {/* Upload digital bill */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-xl font-semibold">Upload Bill</h3>
            <p className="text-muted-foreground text-sm">Upload any image or PDF of your bill</p>
          </div>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isScanning}>
            <Upload className="h-4 w-4 mr-2" />
            {isScanning ? "Uploading..." : "Upload Bill"}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
        </div>
      </Card>

      {/* Scanned/Uploaded Bill Dialog with category selection */}
      <Dialog open={!!scannedData} onOpenChange={() => setScannedData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bill Details</DialogTitle>
          </DialogHeader>
          
          {scannedData && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Amount</Label>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" type="number" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Food & Dining","Transportation","Shopping","Entertainment",
                          "Bills & Utilities","Health & Fitness","Travel","Other"
                        ].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Description</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="E.g. Merchant - Bill" />
                  </div>
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
    </div>
  );
};