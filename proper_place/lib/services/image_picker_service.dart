import 'package:flutter/material.dart';
import 'package:wechat_assets_picker/wechat_assets_picker.dart';
import 'package:image/image.dart' as img;
import 'dart:io';

class ImagePickerService {
  /// Strip EXIF metadata from image (removes location data, timestamps, etc)
  static Future<File> _stripExifData(File imageFile) async {
    try {
      // Read the image file
      final bytes = await imageFile.readAsBytes();
      
      // Decode the image
      final image = img.decodeImage(bytes);
      
      if (image == null) return imageFile;
      
      // Re-encode the image to strip all metadata
      final cleanedBytes = img.encodeJpg(image, quality: 95);
      
      // Write back to file
      await imageFile.writeAsBytes(cleanedBytes);
      return imageFile;
    } catch (e) {
      print('Error stripping EXIF data: $e');
      // Return original file if stripping fails
      return imageFile;
    }
  }

  /// Show custom image picker without metadata display
  static Future<File?> showImagePickerOptions(BuildContext context) async {
    final List<AssetEntity>? result = await AssetPicker.pickAssets(
      context,
      pickerConfig: AssetPickerConfig(
        maxAssets: 1,
        requestType: RequestType.image,
        pageSize: 120,
        pathNameBuilder: DefaultAssetPickerPathNameBuilder(),
      ),
    );

    if (result != null && result.isNotEmpty) {
      final AssetEntity asset = result.first;
      final File? file = await asset.file;
      
      if (file != null) {
        // Strip location and other EXIF data
        return await _stripExifData(file);
      }
    }
    
    return null;
  }
}
