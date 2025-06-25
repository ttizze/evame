'use server';
import { redirect } from 'next/navigation';
import { uploadImage } from '@/app/[locale]/_lib/upload';
import type { ActionResponse } from '@/app/types';
import { getCurrentUser, unstable_update } from '@/auth';
import { updateUserImage } from '../_db/mutations.server';

export type UserImageEditState = ActionResponse<
  {
    imageUrl: string;
  },
  void
>;

export async function userImageEditAction(
  previousState: UserImageEditState,
  formData: FormData
): Promise<UserImageEditState> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return redirect('/auth/login');
  }
  const file = formData.get('image') as File;
  if (!file) {
    return { success: false, message: 'No image provided' };
  }
  if (file) {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return {
        success: false,
        message: 'Image size exceeds 5MB limit. Please choose a smaller file.',
      };
    }
  }
  const result = await uploadImage(file);
  if (!(result.success && result.data?.imageUrl)) {
    return {
      success: false,
      message: 'Failed to upload image',
    };
  }
  await updateUserImage(currentUser.id, result.data?.imageUrl);
  await unstable_update({
    user: {
      name: currentUser.name,
      handle: currentUser.handle,
      profile: currentUser.profile,
      twitterHandle: currentUser.twitterHandle,
      image: result.data?.imageUrl,
    },
  });
  return {
    success: true,
    data: { imageUrl: result.data?.imageUrl },
    message: 'Profile image updated successfully',
  };
}
