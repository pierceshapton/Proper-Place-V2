import 'package:flutter/material.dart';
import 'package:wechat_assets_picker/wechat_assets_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as img;
import 'dart:io';

class ImagePickerService {
  static final ImagePicker _picker = ImagePicker();

  /// Strip EXIF metadata from image (removes location data, timestamps, etc)
  /// Call this at upload time, not at selection time for better UX
  static Future<File> stripExifData(File imageFile) async {
    try {
      // Read the image file
      final bytes = await imageFile.readAsBytes();
      
      // Decode the image
      final image = img.decodeImage(bytes);
      
      if (image == null) return imageFile;
      
      // Re-encode the image to strip all metadata
      final cleanedBytes = img.encodeJpg(image, quality: 85);
      
      // Write to a new temp file to avoid corrupting the original
      final tempDir = imageFile.parent;
      final tempFile = File('${tempDir.path}/cleaned_${DateTime.now().millisecondsSinceEpoch}.jpg');
      await tempFile.writeAsBytes(cleanedBytes);
      return tempFile;
    } catch (e) {
      print('Error stripping EXIF data: $e');
      // Return original file if stripping fails
      return imageFile;
    }
  }

  /// Pick a single image using native gallery (auto-confirms on selection)
  /// Returns immediately without processing for fast UI response
  static Future<File?> pickSingleImage(BuildContext context) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );

      if (pickedFile != null) {
        return File(pickedFile.path);
      }
    } catch (e) {
      print('Error picking single image: $e');
    }
    return null;
  }

  /// Pick multiple images using wechat_assets_picker
  /// Returns immediately without processing for fast UI response
  static Future<List<File>> pickMultipleImages(BuildContext context, {int maxAssets = 10}) async {
    try {
      final List<AssetEntity>? result = await AssetPicker.pickAssets(
        context,
        pickerConfig: AssetPickerConfig(
          maxAssets: maxAssets,
          requestType: RequestType.image,
          pageSize: 120,
        ),
      );

      if (result != null && result.isNotEmpty) {
        final List<File> files = [];
        for (final asset in result) {
          final file = await asset.file;
          if (file != null) {
            files.add(file);
          }
        }
        return files;
      }
    } catch (e) {
      print('Error picking multiple images: $e');
    }
    return [];
  }

  /// Strip EXIF from multiple files before upload
  static Future<List<File>> stripExifFromFiles(List<File> files) async {
    final List<File> cleanedFiles = [];
    for (final file in files) {
      final cleaned = await stripExifData(file);
      cleanedFiles.add(cleaned);
    }
    return cleanedFiles;
  }

  /// Legacy method - now uses single image picker (no tick confirmation)
  static Future<File?> showImagePickerOptions(BuildContext context) async {
    return pickSingleImage(context);
  }
}
