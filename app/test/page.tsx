'use client'
import React from "react";
import CommentBox from "@/components/comments/CommentBox";
import QuickAddHome from "@/components/home/QuickAddHome";
export default function TestPage() {
  return (
    <div className="p-4">
      <CommentBox itemId="cmf3q1b820002fxmv0a6sigst" />
      <QuickAddHome onSubmit={function (payload: { name: string; desc: string; tags: string[]; rating: number; comment: string; imageUrl: string | null; productUrl: string | null; }): Promise<boolean | { ok: boolean; duplicate?: boolean; error?: string; }> | boolean | { ok: boolean; duplicate?: boolean; error?: string; } {
              throw new Error("Function not implemented.");
          } }></QuickAddHome>
    </div>
  );
}

