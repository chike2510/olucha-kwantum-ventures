import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import ProductDetail from "./pages/ProductDetail";
import Account from "@/pages/Account";
import Shop from "@/pages/Shop";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import News from "@/pages/News";
import NewsArticle from "@/pages/NewsArticle";
import { About, FaqPage } from "@/pages/info/AboutFaq";
import { PoliciesHub, PrivacyPolicy, ReturnsPolicy, ShippingPolicy, Terms } from "@/pages/info/PolicyPages";

/** Scroll to the top on route changes (keeps in-page #anchor links working). */
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);
  return null;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/shop/:category"} component={Shop} />
      <Route path={"/shop"} component={Shop} />
      <Route path={"/cart"} component={Cart} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/news/:slug"} component={NewsArticle} />
      <Route path={"/news"} component={News} />
      <Route path={"/products/:slug"} component={ProductDetail} />
      <Route path={"/account/orders"} component={Account} />
      <Route path={"/account"} component={Account} />
      <Route path={"/about"} component={About} />
      <Route path={"/faq"} component={FaqPage} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/policies/privacy"} component={PrivacyPolicy} />
      <Route path={"/policies/shipping"} component={ShippingPolicy} />
      <Route path={"/policies/returns"} component={ReturnsPolicy} />
      <Route path={"/policies"} component={PoliciesHub} />
      <Route path={"/privacy"} component={PrivacyPolicy} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <ScrollToTop />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
