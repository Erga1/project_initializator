import 'package:flutter_test/flutter_test.dart';
import 'package:{{dartName}}/app.dart';

void main() {
  testWidgets('counter increments when the button is tapped', (tester) async {
    await tester.pumpWidget(const App());
    expect(find.text('0'), findsOneWidget);

    await tester.tap(find.byType(FloatingActionButton));
    await tester.pump();

    expect(find.text('1'), findsOneWidget);
  });
}
