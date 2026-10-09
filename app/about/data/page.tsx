import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import ReportIssue from "@/app/components/history/ReportIssue";
import { pageMetadata } from "@/lib/seo";
import "@/app/components/history/history.css";

export const metadata = pageMetadata({
  title: "Data | ROB",
  description: "How ROB structures factual art-history records and how to ask for a correction.",
  path: "/about/data",
});

export default function DataPolicyPage() {
  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap">
        <h1 className="rh-title">How ROB uses data</h1>
        <p>ROB structures factual art-history information from artist and gallery contributions, public official sources, and open data.</p>
        <p>A source line means the fact was read from that page. It does not mean the institution approved ROB.</p>
        <p>ROB does not reproduce external artwork images or long source texts as its own content. Factual records link back to the original page.</p>
        <p>ROB welcomes corrections. A report is kept internally and is not published with your identity.</p>
        <ReportIssue />
        <p><Link href="/history/start">Start your history</Link></p>
      </main>
    </div>
  );
}
