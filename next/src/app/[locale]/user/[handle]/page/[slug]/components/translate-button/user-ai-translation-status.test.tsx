// import { render, screen } from '@testing-library/react';
// import { afterEach, describe, expect, it, vi } from 'vitest';
// import { UserAITranslationStatus } from './user-ai-translation-status';
// import type { UserAITranslationInfo } from '@prisma/client';
// import { TranslationStatus } from '@prisma/client';
// import { useRouter } from 'next/navigation';
// // Mock external dependencies
// vi.mock('@/components/ui/progress', () => ({
//   Progress: ({ value, className }: { value: number; className: string }) => (
//     <div data-testid="progress" className={className} data-value={value} />
//   )
// }));

// vi.mock('next/navigation', () => ({
//   useRouter: () => ({ refresh: vi.fn() })
// }));

// describe('UserAITranslationStatus', () => {
//   afterEach(() => {
//     vi.clearAllMocks();
//     vi.useRealTimers();
//   });

//   const baseProps = {
//     userAITranslationInfo:{
//       id: 1,
//       userId: 'user1',
//       pageId: 1,
//       locale: 'en',
//       aiModel: 'gpt-4o',
//       aiTranslationStatus: TranslationStatus.IN_PROGRESS,
//       aiTranslationProgress: 50,
//       createdAt: new Date()
//     } as UserAITranslationInfo
//   };

//   it('renders nothing when no translation info', () => {
//     const { container } = render(<UserAITranslationStatus userAITranslationInfo={null} />);
//     expect(container).toBeEmptyDOMElement();
//   });

//   it('displays correct progress and status', () => {
//     render(<UserAITranslationStatus {...baseProps} />);

//     expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '50');
//     expect(screen.getByText('50')).toBeInTheDocument();
//     expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
//   });

//   it('applies correct styling for IN_PROGRESS status', () => {
//     render(<UserAITranslationStatus {...baseProps} />);
//     const progress = screen.getByTestId('progress');
//     expect(progress).toHaveClass('bg-blue-400');
//     expect(progress).toHaveClass('animate-pulse');
//   });

//   it('applies correct styling for FAILED status', () => {
//     const props = {
//       userAITranslationInfo: {
//         ...baseProps.userAITranslationInfo,
//         aiTranslationStatus: TranslationStatus.FAILED
//       }
//     };
//     render(<UserAITranslationStatus {...props} />);
//     expect(screen.getByTestId('progress')).toHaveClass('bg-red-400');
//   });

//   it('sets up refresh interval for non-completed status', () => {
//     vi.useFakeTimers();
//     render(<UserAITranslationStatus {...baseProps} />);

//     vi.advanceTimersByTime(3000);
//     expect(vi.mocked(useRouter().refresh)).toHaveBeenCalledTimes(1);
//   });

//   it('does not set interval for COMPLETED status', () => {
//     vi.useFakeTimers();
//     const props = {
//       userAITranslationInfo: {
//         ...baseProps.userAITranslationInfo,
//         aiTranslationStatus: TranslationStatus.COMPLETED
//       }
//     };
//     render(<UserAITranslationStatus {...props} />);

//     vi.advanceTimersByTime(3000);
//     expect(vi.mocked(useRouter().refresh)).not.toHaveBeenCalled();
//   });
// });
