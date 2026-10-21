'use client';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

/** v3.383 확인 창을 거치는 행동 버튼(브리프 6.4: 파괴적 행동은 확인 Dialog). title 이 없으면 label 을 제목으로 씁니다. */
export function ConfirmAction({ label, title, description, onConfirm, disabled, confirmLabel = '확인', variant = 'outline', size = 'sm', className, icon, hint }: {
    label: ReactNode; title?: ReactNode; description: ReactNode; onConfirm: () => void; disabled?: boolean; confirmLabel?: string;
    variant?: ComponentProps<typeof Button>['variant']; size?: ComponentProps<typeof Button>['size']; className?: string; icon?: ReactNode; hint?: string;
}) {
    return <AlertDialog>
        <AlertDialogTrigger asChild><Button type="button" variant={variant} size={size} className={className} disabled={disabled} title={hint}>{icon}{label}</Button></AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{title ?? label}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>;
}
