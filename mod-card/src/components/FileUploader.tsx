'use client';

import React, { ChangeEvent } from 'react';
import { CardParser } from '../lib/parser';
import { CardV3 } from '../types/card';
import { useT } from '../i18n/I18nProvider';

interface FileUploaderProps {
  onCardLoaded: (card: CardV3, rawJson?: string, isLorebook?: boolean) => void;
}

export default function FileUploader({ onCardLoaded }: FileUploaderProps) {
  const t = useT();
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      try {
        const { card, isLorebook } = CardParser.load(result);
        onCardLoaded(card, result, isLorebook);
      } catch (err) {
        alert(t.fuAlertBadJson + (err as Error).message);
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 border-2 border-dashed border-gray-400 rounded-lg text-center hover:bg-gray-100 transition-colors">
      <h3 className="text-lg font-bold text-gray-950 mb-2">{t.fuTitle}</h3>
      <p className="text-gray-800 font-semibold mb-4">{t.fuDesc}</p>
      <input
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-950 hover:file:bg-blue-200 cursor-pointer"
      />
    </div>
  );
}
