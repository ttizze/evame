'use client';

import { CopyIcon, Share } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import {
  FacebookIcon,
  FacebookShareButton,
  RedditIcon,
  RedditShareButton,
  TwitterShareButton,
} from 'react-share';
import { toast } from 'sonner';
import { useDisplay } from '@/app/_context/display-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function ShareDialog() {
  const [isOpen, setIsOpen] = useState(false);

  /* いま表示中のモードを取得 */
  const { mode } = useDisplay();

  const shareTitle = typeof window !== 'undefined' ? document.title : '';

  /* 共有 URL を組み立て */
  const getShareUrl = () => {
    if (typeof window === 'undefined') {
      return '';
    }
    const url = new URL(window.location.href);
    url.searchParams.set('displayMode', mode);
    return url.toString();
  };

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button
          className="h-10 w-10 rounded-full border bg-background"
          size="icon"
          variant="ghost"
        >
          <Share className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Share</DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-6">
          <div className="flex justify-center space-x-4">
            {/* コピー */}
            <Button
              className="rounded-full"
              onClick={() => {
                navigator.clipboard.writeText(getShareUrl());
                toast.success('Copied to clipboard');
              }}
              size="icon"
              variant="outline"
            >
              <CopyIcon className="h-4 w-4" />
            </Button>

            {/* SNS */}
            <FacebookShareButton url={getShareUrl()}>
              <FacebookIcon round size={32} />
            </FacebookShareButton>

            <TwitterShareButton title={shareTitle} url={getShareUrl()}>
              <Image
                alt="X"
                className="dark:invert"
                height={32}
                src="/x.svg"
                width={32}
              />
            </TwitterShareButton>

            <RedditShareButton title={shareTitle} url={getShareUrl()}>
              <RedditIcon round size={32} />
            </RedditShareButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
