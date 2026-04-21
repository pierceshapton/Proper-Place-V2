import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:proper_place/main.dart' as app;
import 'package:proper_place/services/payment_service.dart';
import 'package:proper_place/services/storage_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {}

  try {
    await PaymentService.initialize();
  } catch (_) {}

  await StorageService.setAdminMode(false);
  await StorageService.setHostMode(false);
  await StorageService.cacheMapLocation(
    latitude: 51.9283,
    longitude: -1.7246,
    zoom: 14,
  );

  runApp(const app.MyApp());

  Future.delayed(const Duration(seconds: 3), () {
    var attempts = 0;
    Timer.periodic(const Duration(seconds: 1), (timer) {
      attempts += 1;
      app.openMapPlace('24', 51.9283, -1.7246);

      if (attempts >= 12) {
        timer.cancel();
      }
    });
  });
}
