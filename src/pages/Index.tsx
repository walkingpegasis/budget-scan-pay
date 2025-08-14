import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseTracker } from "@/components/ExpenseTracker";
import { ScanPayFeature } from "@/components/ScanPayFeature";
import { BankIntegration } from "@/components/BankIntegration";
import { Wallet, Camera, Building2 } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("tracker");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="tracker" className="flex items-center space-x-2">
              <Wallet className="h-4 w-4" />
              <span>Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="scan-pay" className="flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <span>Scan & Pay</span>
            </TabsTrigger>
            <TabsTrigger value="banks" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Banks</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracker">
            <ExpenseTracker />
          </TabsContent>

          <TabsContent value="scan-pay">
            <ScanPayFeature />
          </TabsContent>

          <TabsContent value="banks">
            <BankIntegration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
