'use client';
import type { ReactNode } from 'react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

/** 누르면 확인 창을 띄우는 버튼. title이 없으면 label을 제목으로 씁니다. */
export function ConfirmButton({ label, title, description, disabled, onConfirm, confirmLabel = '확인', icon, className = 'secondary', hint }: {
    label: string;
    title?: string;
    description: string;
    disabled: boolean;
    onConfirm: () => void;
    confirmLabel?: string;
    icon?: ReactNode;
    /** v3.165 버튼 class(기본 secondary)와 버튼 툴팁. */
    className?: string;
    hint?: string;
}) {
    return <AlertDialog>
        <AlertDialogTrigger asChild><button className={className} disabled={disabled} title={hint}>{icon}{label}</button></AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{title ?? label}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>;
}
