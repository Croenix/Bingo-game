import 'package:flutter_test/flutter_test.dart';
import 'package:bingo_mobile_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const BingoMobileApp());
  });
}
