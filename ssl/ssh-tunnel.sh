#!/bin/bash

# SSH туннель для доступа к WebXR серверу
# Использование: ./ssh-tunnel.sh [remote_host] [remote_port]

REMOTE_HOST=${1:-"your-server.com"}
REMOTE_PORT=${2:-"22"}
LOCAL_PORT="3000"

echo "🔗 Создание SSH туннеля для WebXR сервера..."
echo "   Удаленный хост: $REMOTE_HOST"
echo "   Удаленный порт: $REMOTE_PORT"
echo "   Локальный порт: $LOCAL_PORT"
echo ""
echo "📱 После подключения используйте:"
echo "   https://localhost:$LOCAL_PORT"
echo ""
echo "⚠️  Убедитесь, что на удаленном сервере запущен:"
echo "   bun run dev"
echo ""

# Создаем SSH туннель
ssh -L $LOCAL_PORT:localhost:3000 -N $REMOTE_HOST -p $REMOTE_PORT
