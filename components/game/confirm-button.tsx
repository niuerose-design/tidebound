'use client';
import type { ReactNode } from 'react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

/** 누르면 확인 창을 띄우는 버튼. title이 없으면 label을 제목으로 씁니다. */
export function ConfirmButton({ label, title, description, disabled, onConfirm, confirmLabel = '확인', icon }: {
    label: string;
    title?: string;
    description: string;
    disabled: boolean;
    onConfirm: () => void;
    confirmLabel?: string;
    icon?: ReactNode;
}) {
    return <AlertDialog>
        <AlertDialogTrigger asChild><button className="secondary" disabled={disabled}>{icon}{label}</button></AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{title ?? label}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>;
}
