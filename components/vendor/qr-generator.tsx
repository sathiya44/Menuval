"use client";

import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function QrGenerator({
  menuUrl,
  shopName
}: {
  menuUrl: string;
  shopName: string;
}) {
  const [qrImage, setQrImage] = useState("");
  const [isPending, startTransition] = useTransition();

  function generateQr() {
    startTransition(async () => {
      const image = await QRCode.toDataURL(menuUrl, {
        width: 640,
        margin: 2,
        color: {
          dark: "#1d6848",
          light: "#ffffff"
        }
      });
      setQrImage(image);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={generateQr} disabled={isPending}>
          <QrCode className="h-4 w-4" />
          {isPending ? "Generating" : "Generate QR"}
        </Button>
        {qrImage ? (
          <Button asChild variant="outline">
            <a href={qrImage} download={`${shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-menu-qr.png`}>
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
        ) : null}
      </div>

      {qrImage ? (
        <div className="w-fit rounded-lg border bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrImage} alt={`${shopName} menu QR code`} className="h-48 w-48" />
        </div>
      ) : null}
    </div>
  );
}
