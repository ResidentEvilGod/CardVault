import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Scan from "./pages/Scan";
import CardDetail from "./pages/CardDetail";
import Binder from "./pages/Binder";
import SellAssistant from "./pages/SellAssistant";
import SalesActivity from "./pages/SalesActivity";
import ListingTemplates from "./pages/ListingTemplates";
import Credits from "./pages/Credits";
import PurchaseHistory from "./pages/PurchaseHistory";
import AdminDashboard from "./pages/AdminDashboard";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import HelpCenter from "./pages/HelpCenter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/scan" component={Scan} />
      <Route path="/card/:id" component={CardDetail} />
      <Route path="/binder" component={Binder} />
      <Route path="/sell-assistant" component={SellAssistant} />
      <Route path="/sales-activity" component={SalesActivity} />
      <Route path="/listing-templates" component={ListingTemplates} />
      <Route path="/credits" component={Credits} />
      <Route path="/purchase-history" component={PurchaseHistory} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/user-profile" component={UserProfile} />
      <Route path="/settings" component={Settings} />
      <Route path="/help-center" component={HelpCenter} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppLayout>
            <Router />
          </AppLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
