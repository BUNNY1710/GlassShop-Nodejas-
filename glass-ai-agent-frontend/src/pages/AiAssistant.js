import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/PageWrapper";
import api from "../api/api";
import { Card, Button, Input, Select, PageHeader, EmptyState } from "../components/ui";
import { ai as copy } from "../design/copy";
import { type } from "../design/typography";
import { cn } from "../lib/utils";
import {
  Bot, AlertTriangle, TrendingUp, Package, Building2,
  History, X, Trash2, Copy, Check, Send, Sparkles
} from "lucide-react";

function AiAssistant() {
  const [action, setAction] = useState("");
  const [glassType, setGlassType] = useState("");
  const [site, setSite] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("aiQueryHistory");
    if (saved) {
      try {
        setQueryHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history");
      }
    }
  }, []);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [result]);

  const askAI = async (quickAction = null) => {
    const selectedAction = quickAction || action;

    if (!selectedAction) {
      setResult(copy.errors.selectAction);
      return;
    }

    if (selectedAction === "AVAILABLE" && !glassType) {
      setResult(copy.errors.selectGlass);
      return;
    }

    if (selectedAction === "INSTALLED" && !site) {
      setResult(copy.errors.selectSite);
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const payload = {
        action: selectedAction,
        glassType: selectedAction === "AVAILABLE" ? glassType : undefined,
        site: selectedAction === "INSTALLED" ? site : undefined,
      };

      const res = await api.post("/ai/ask", payload);
      const response = res.data;
      animateTyping(response);

      const historyItem = {
        id: Date.now(),
        action: selectedAction,
        query: getQueryText(selectedAction, glassType, site),
        response: response,
        timestamp: new Date().toISOString(),
      };

      const newHistory = [historyItem, ...queryHistory.slice(0, 9)];
      setQueryHistory(newHistory);
      localStorage.setItem("aiQueryHistory", JSON.stringify(newHistory));
    } catch (error) {
      setResult(copy.errors.fetchFailed);
    } finally {
      setLoading(false);
    }
  };

  const animateTyping = (text) => {
    setResult("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setResult(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 10);
  };

  const getQueryText = (actionKey, glass, siteName) => {
    switch (actionKey) {
      case "LOW_STOCK": return copy.actions.LOW_STOCK;
      case "AVAILABLE": return `${copy.actions.AVAILABLE} — ${glass}`;
      case "INSTALLED": return `${copy.actions.INSTALLED} — ${siteName}`;
      case "PREDICT": return copy.actions.PREDICT;
      default: return actionKey;
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearHistory = () => {
    setQueryHistory([]);
    localStorage.removeItem("aiQueryHistory");
  };

  const loadFromHistory = (item) => {
    setAction(item.action);
    if (item.action === "AVAILABLE") {
      setGlassType(item.query.includes("5MM") ? "5MM" : item.query.includes("8MM") ? "8MM" : "10MM");
    }
    if (item.action === "INSTALLED") {
      const siteMatch = item.query.match(/— (.+)/);
      if (siteMatch) setSite(siteMatch[1].trim());
    }
    setResult(item.response);
    setShowHistory(false);
  };

  const quickActions = [
    { id: "LOW_STOCK", icon: <AlertTriangle size={22} />, ...copy.quickActions.lowStock, accent: "from-rose-500/10 to-rose-500/5 border-rose-500/15 text-rose-600" },
    { id: "PREDICT", icon: <TrendingUp size={22} />, ...copy.quickActions.predict, accent: "from-violet-500/10 to-indigo-500/5 border-violet-500/15 text-sky-600" },
    { id: "AVAILABLE", icon: <Package size={22} />, ...copy.quickActions.available, accent: "from-cyan-500/10 to-blue-500/5 border-cyan-500/15 text-cyan-600" },
    { id: "INSTALLED", icon: <Building2 size={22} />, ...copy.quickActions.installed, accent: "from-emerald-500/10 to-teal-500/5 border-emerald-500/15 text-emerald-600" },
  ];

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto page-section">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          icon={<Sparkles size={26} />}
          actions={
            <Button
              variant="outline"
              icon={<History size={18} />}
              onClick={() => setShowHistory(!showHistory)}
            >
              {copy.history}{queryHistory.length > 0 ? ` (${queryHistory.length})` : ""}
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((qa) => (
            <motion.div
              key={qa.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'p-5 rounded-2xl border cursor-pointer transition-all duration-300',
                'bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm',
                'hover:shadow-card-hover',
                qa.accent
              )}
              onClick={() => {
                setAction(qa.id);
                if (qa.id === "AVAILABLE") setTimeout(() => document.getElementById("glassTypeSelect")?.focus(), 100);
                if (qa.id === "INSTALLED") setTimeout(() => document.getElementById("siteInput")?.focus(), 100);
              }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-sm">
                {qa.icon}
              </div>
              <h3 className={type.h4}>{qa.title}</h3>
              <p className={cn(type.bodySm, 'mt-1 mb-4')}>{qa.description}</p>
              <button
                type="button"
                className={cn(type.button, 'text-sky-600 dark:text-sky-400 flex items-center gap-1 hover:gap-2 transition-all')}
                onClick={(e) => { e.stopPropagation(); askAI(qa.id); }}
              >
                {copy.quickActions.run} <Sparkles size={14} aria-hidden />
              </button>
            </motion.div>
          ))}
        </div>

        <Card padding="lg" glass>
          <h3 className={cn(type.h3, 'mb-6 flex items-center gap-2')}>
            <Bot className="text-sky-500" size={22} aria-hidden /> {copy.form.title}
          </h3>

          <div className="space-y-5">
            <Select
              label={copy.form.action}
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="">{copy.form.actionPlaceholder}</option>
              <option value="LOW_STOCK">{copy.actions.LOW_STOCK}</option>
              <option value="AVAILABLE">{copy.actions.AVAILABLE}</option>
              <option value="INSTALLED">{copy.actions.INSTALLED}</option>
              <option value="PREDICT">{copy.actions.PREDICT}</option>
            </Select>

            <AnimatePresence mode="popLayout">
              {action === "AVAILABLE" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Select
                    id="glassTypeSelect"
                    label={copy.form.glassType}
                    value={glassType}
                    onChange={(e) => setGlassType(e.target.value)}
                  >
                    <option value="">{copy.form.glassTypePlaceholder}</option>
                    <option value="5MM">5 mm</option>
                    <option value="8MM">8 mm</option>
                    <option value="10MM">10 mm</option>
                  </Select>
                </motion.div>
              )}

              {action === "INSTALLED" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Input
                    id="siteInput"
                    label={copy.form.site}
                    placeholder={copy.form.sitePlaceholder}
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              icon={<Send size={18} />}
              loading={loading}
              disabled={!action || (action === "AVAILABLE" && !glassType) || (action === "INSTALLED" && !site)}
              onClick={() => askAI()}
              className="mt-2"
            >
              {loading ? copy.form.loading : copy.form.submit}
            </Button>
          </div>
        </Card>

        <AnimatePresence>
          {result && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card padding="lg" glass className="border-sky-500/10">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className={cn(type.h3, 'flex items-center gap-2')}>
                    <Sparkles className="text-sky-500" size={18} aria-hidden /> {copy.response.title}
                  </h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    onClick={copyToClipboard}
                  >
                    {copied ? copy.response.copied : copy.response.copy}
                  </Button>
                </div>

                <pre className={cn(type.body, 'whitespace-pre-wrap bg-slate-50/80 dark:bg-slate-900/60 p-6 rounded-xl border border-slate-100 dark:border-slate-800 font-sans')}>
                  {result}
                </pre>

                <p className={cn(type.caption, 'mt-4 pt-4 border-t border-slate-100 dark:border-slate-800')}>
                  {copy.response.generated(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))}
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistory && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setShowHistory(false)}
              />
              <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-full md:w-96 glass-premium shadow-elevated z-50 flex flex-col border-l border-slate-200/50 dark:border-slate-800"
              >
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className={cn(type.h4, 'flex items-center gap-2')}>
                    <History size={18} aria-hidden /> {copy.historyPanel.title}
                  </h3>
                  <button type="button" onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors focus-ring" aria-label="Close history">
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {queryHistory.length === 0 ? (
                    <EmptyState
                      icon={<History size={24} />}
                      title={copy.historyPanel.empty}
                      className="py-12 border-none bg-transparent"
                    />
                  ) : (
                    <>
                      <Button variant="danger" size="sm" icon={<Trash2 size={16} />} fullWidth onClick={clearHistory}>
                        {copy.historyPanel.clear}
                      </Button>
                      <div className="space-y-3 mt-2">
                        {queryHistory.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => loadFromHistory(item)}
                            className="w-full text-left p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all focus-ring"
                          >
                            <p className={type.bodyStrong}>{item.query}</p>
                            <p className={cn(type.caption, 'mt-1 tabular-nums')}>
                              {new Date(item.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}

export default AiAssistant;
