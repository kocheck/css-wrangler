import { useEffect } from "react";
import BlockedScreen from "./components/BlockedScreen";
import EditList from "./components/EditList";
import Footer from "./components/Footer";
import Header from "./components/Header";
import PickButton from "./components/PickButton";
import { useEditStore } from "./store/editStore";
import { onContentMessage, sendToContent } from "./store/messageBridge";

export default function App() {
  const setSource = useEditStore((s) => s.setSource);
  const setContentReady = useEditStore((s) => s.setContentReady);
  const receiveElement = useEditStore((s) => s.receiveElement);
  const cancelPick = useEditStore((s) => s.cancelPick);
  const undo = useEditStore((s) => s.undo);
  const contentReady = useEditStore((s) => s.contentReady);
  const url = useEditStore((s) => s.url);

  // initial ping to detect whether the content script is reachable
  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const res = (await sendToContent({ type: "ping" })) as
          | { type: "pong"; url: string; stylingSystem: never }
          | undefined;
        if (cancelled) return;
        if (res && "type" in res && res.type === "pong") {
          setSource(res.url, res.stylingSystem);
          setContentReady(true);
        }
      } catch {
        if (!cancelled) setContentReady(false);
      }
    };
    void probe();
    const interval = window.setInterval(probe, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [setSource, setContentReady]);

  // listen for content → panel messages
  useEffect(() => {
    return onContentMessage((msg) => {
      if (msg.type === "element-picked") {
        receiveElement(msg.element, msg.computed);
      } else if (msg.type === "pick-cancelled") {
        useEditStore.setState({ pickActive: false });
      } else if (msg.type === "content-ready" || msg.type === "pong") {
        setSource(msg.url, msg.stylingSystem);
        setContentReady(true);
      }
    });
  }, [receiveElement, setSource, setContentReady]);

  // global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void cancelPick();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        void undo();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cancelPick, undo]);

  return (
    <div className="app">
      <Header />
      {!contentReady && url === "" ? (
        <BlockedScreen />
      ) : (
        <>
          <div className="pick-section">
            <PickButton />
          </div>
          <EditList />
          <Footer />
        </>
      )}
    </div>
  );
}
