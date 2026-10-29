import 'package:dio/dio.dart';

/// Base URL of your backend. Override at build time:
/// `flutter run --dart-define=API_URL=https://api.example.com`
///
/// The default targets the host machine from the Android emulator. The iOS
/// simulator can use http://localhost:3000 instead.
const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

Dio createApiClient() {
  return Dio(
    BaseOptions(
      baseUrl: apiUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
    ),
  );
}
