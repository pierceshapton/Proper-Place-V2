import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class ImagePickerService {
  static final ImagePicker _imagePicker = ImagePicker();

  /// Pick a single image from gallery
  static Future<File?> pickImageFromGallery() async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 100,
      );
      if (pickedFile != null) {
        return File(pickedFile.path);
      }
    } catch (e) {
      print('Error picking image from gallery: $e');
    }
    return null;
  }

  /// Pick image from camera
  static Future<File?> pickImageFromCamera() async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 100,
      );
      if (pickedFile != null) {
        return File(pickedFile.path);
      }
    } catch (e) {
      print('Error picking image from camera: $e');
    }
    return null;
  }

  /// Show image picker options dialog with fullscreen preview
  static Future<File?> showImagePickerOptions(BuildContext context) async {
    File? selectedFile;
    
    // First show the source selection dialog
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (BuildContext sheetContext) {
        return Padding(
          padding: const EdgeInsets.only(top: 12, bottom: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Text(
                'Select Image',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3B82F6).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.camera_alt, color: Color(0xFF3B82F6)),
                ),
                title: const Text('Take Photo', style: TextStyle(color: Colors.black)),
                subtitle: const Text('Use your camera', style: TextStyle(color: Colors.grey)),
                onTap: () => Navigator.pop(sheetContext, ImageSource.camera),
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3B82F6).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.photo_library, color: Color(0xFF3B82F6)),
                ),
                title: const Text('Choose from Gallery', style: TextStyle(color: Colors.black)),
                subtitle: const Text('Select from your photos', style: TextStyle(color: Colors.grey)),
                onTap: () => Navigator.pop(sheetContext, ImageSource.gallery),
              ),
              const SizedBox(height: 4),
              TextButton(
                onPressed: () => Navigator.pop(sheetContext),
                child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
              ),
            ],
          ),
        );
      },
    );

    if (source == null) return null;

    // Pick the image based on selected source
    if (source == ImageSource.camera) {
      selectedFile = await pickImageFromCamera();
    } else {
      selectedFile = await pickImageFromGallery();
    }

    if (selectedFile == null) return null;

    // Show fullscreen preview with confirm/reselect options - loop until confirmed or cancelled
    while (context.mounted) {
      final result = await Navigator.push<_PreviewResult>(
        context,
        MaterialPageRoute(
          fullscreenDialog: true,
          builder: (previewContext) => _ImagePreviewScreen(imageFile: selectedFile!),
        ),
      );

      if (result == null) {
        // User cancelled (tapped X)
        return null;
      } else if (result.confirmed) {
        // User confirmed the image
        return selectedFile;
      } else {
        // User wants to reselect - go directly to gallery
        File? newFile = await pickImageFromGallery();

        if (newFile == null) return null;
        selectedFile = newFile;
        // Loop continues to show preview of new image
      }
    }

    return null;
  }
}

/// Result from preview screen
class _PreviewResult {
  final bool confirmed;
  const _PreviewResult({required this.confirmed});
}

/// Fullscreen image preview screen
class _ImagePreviewScreen extends StatelessWidget {
  final File imageFile;

  const _ImagePreviewScreen({required this.imageFile});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Full screen image
          Center(
            child: InteractiveViewer(
              minScale: 0.5,
              maxScale: 4.0,
              child: Image.file(
                imageFile,
                fit: BoxFit.contain,
                width: double.infinity,
                height: double.infinity,
              ),
            ),
          ),
          // Top bar with close button
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.7),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white, size: 28),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Text(
                      'Preview Image',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 48), // Spacer for alignment
                  ],
                ),
              ),
            ),
          ),
          // Bottom buttons
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withOpacity(0.8),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    // Reselect button
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => Navigator.pop(context, const _PreviewResult(confirmed: false)),
                        icon: const Icon(Icons.refresh, color: Colors.white),
                        label: const Text(
                          'Reselect',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white, width: 2),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    // Use this image button
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => Navigator.pop(context, const _PreviewResult(confirmed: true)),
                        icon: const Icon(Icons.check, color: Colors.white),
                        label: const Text(
                          'Use Image',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF3B82F6),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
