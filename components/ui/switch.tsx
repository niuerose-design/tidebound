'use client';
import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

/**
 * v3.379 스위치(shadcn 기본 + 토큰). 켜짐은 accent, 꺼짐은 surface-3.
 * 터치 기기의 공통 규칙(responsive.css: button min-height 44px)은 모양을 망가뜨리므로 높이를 고정하고, 닿는 영역은 ::after 로 44pt 를 채웁니다(docs/ui-hig.md).
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
    return <SwitchPrimitive.Root data-slot="switch" className={cn(
        'peer relative inline-flex h-6! min-h-6! w-11 shrink-0 cursor-pointer items-center rounded-full border border-line transition-colors outline-none',
        'after:absolute after:-inset-x-2 after:-inset-y-2.5 after:content-[""]',
        'focus-visible:ring-[3px] focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-3', className)} {...props}>
        <SwitchPrimitive.Thumb data-slot="switch-thumb" className="pointer-events-none block size-5 rounded-full bg-ink-1 shadow-1 transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-accent-ink data-[state=unchecked]:translate-x-0.5"/>
    </SwitchPrimitive.Root>;
}
export { Switch };
