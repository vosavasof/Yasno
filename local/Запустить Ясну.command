#!/bin/bash
cd -- "$(dirname "$0")" || exit 1
case "$(uname -m)" in
  arm64) YASNA_NODE="./runtime/arm64/bin/node" ;;
  x86_64) YASNA_NODE="./runtime/x64/bin/node" ;;
  *) echo "Эта архитектура Mac не поддерживается."; read -r; exit 1 ;;
esac
if [ ! -x "$YASNA_NODE" ]; then
  echo "Не найден комплект Node.js. Распакуйте весь архив «Ясны», затем откройте этот файл ещё раз."
  read -r
  exit 1
fi
"$YASNA_NODE" --disable-warning=ExperimentalWarning scripts/start-local.mjs
YASNA_EXIT=$?
if [ "$YASNA_EXIT" -ne 0 ]; then
  echo "Запуск завершился с ошибкой. Скопируйте сообщение выше для диагностики."
  read -r
fi
exit "$YASNA_EXIT"
