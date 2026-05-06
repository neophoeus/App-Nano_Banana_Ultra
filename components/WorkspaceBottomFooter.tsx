import React from 'react';

function WorkspaceBottomFooter() {
    return (
        <footer data-testid="workspace-bottom-footer" className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
            <div className="mx-auto w-full max-w-[1560px] px-4 lg:px-4 xl:px-3">
                <div
                    data-testid="workspace-bottom-footer-bar"
                    className="pointer-events-auto nbu-shell-panel flex h-9 w-full items-center justify-center rounded-b-none rounded-t-[24px] px-3 sm:h-10 sm:px-4"
                >
                    <p className="max-w-full truncate text-center text-[9px] font-semibold tracking-[0.06em] text-slate-600 dark:text-slate-300 sm:text-[11px]">
                        <span>🍌 NANO BANANA ULTRA</span>
                        <span aria-hidden="true"> • </span>
                        <span>Designed by </span>
                        <a
                            data-testid="workspace-bottom-footer-link"
                            href="https://neophoeus.art/"
                            target="_blank"
                            rel="noreferrer"
                            className="transition-colors hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 dark:hover:text-slate-100"
                        >
                            Neophoeus Art
                        </a>
                        <span aria-hidden="true"> • </span>
                        <span>Powered by Gemini AI</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default React.memo(WorkspaceBottomFooter);
