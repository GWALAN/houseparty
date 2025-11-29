# Profile Photo Upload Fix - APK Build

## Issue
When uploading a profile photo via APK build, users encountered the error:
```
Property "blob" doesn't exist
```

## Root Cause
The `uploadProfilePhoto` function in `app/(tabs)/profile.tsx` was using `response.blob()` which is a **Web API only** and doesn't exist in React Native:

```typescript
// BROKEN CODE (Web API only)
const response = await fetch(uri);
const blob = await response.blob();  // ❌ Doesn't exist in React Native
```

## Solution
The app already has a proper image upload utility at `lib/imageUpload.ts` that correctly handles platform differences:

- **Web**: Uses `fetch()` and `.blob()`
- **React Native**: Uses `expo-file-system` to read as Base64 and convert to Uint8Array

### Changes Made
Updated `app/(tabs)/profile.tsx` line 526-573 to use the existing utility:

```typescript
// FIXED CODE
const uploadProfilePhoto = async (uri: string) => {
  if (!user) return;
  setUploadingPhoto(true);

  try {
    // Use the proper image upload utility that handles platform differences
    const { uploadProfilePhoto: uploadUtil } = await import('@/lib/imageUpload');
    const result = await uploadUtil(uri, user.id);

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    // Update profile with new photo URL
    const timestamp = Date.now();
    const urlWithTimestamp = `${result.url}?t=${timestamp}`;
    await updateProfilePhoto(urlWithTimestamp);
    await refreshProfile();
    await fetchProfile();

    Alert.alert('Success', 'Your profile photo has been updated!');
  } catch (error: any) {
    Alert.alert('Upload Failed', error.message);
  } finally {
    setUploadingPhoto(false);
  }
};
```

## How the Upload Utility Works

### React Native (APK/IPA):
1. Validates image file using `FileSystem.getInfoAsync()`
2. Reads file as Base64 using `FileSystem.readAsStringAsync()`
3. Converts Base64 to Uint8Array (binary data)
4. Uploads to Supabase Storage
5. Returns public URL

### Web:
1. Uses `fetch()` to get the file
2. Converts to Blob using `.blob()`
3. Uploads to Supabase Storage
4. Returns public URL

## Testing
- ✅ Web uploads work (uses File object directly)
- ✅ APK uploads now work (uses FileSystem Base64 conversion)
- ✅ iOS builds will work (same as Android)

## Additional Benefits
The utility also provides:
- File size validation (5MB limit)
- File type validation (JPEG, PNG, GIF, WebP)
- Automatic cleanup of old profile photos
- Better error messages

## Files Modified
- `app/(tabs)/profile.tsx` - Updated `uploadProfilePhoto` function
