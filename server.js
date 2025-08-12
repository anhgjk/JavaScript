// server.js
const WebSocket = require('ws');

// 创建一个 WebSocket 服务器实例，监听在 8080 端口
const wss = new WebSocket.Server({ port: 8080 });

console.log('WebSocket 服务器已启动，监听端口 8080');

// 存储所有连接的客户端
const clients = new Set();

// 当有客户端连接时
wss.on('connection', ws => {
    console.log('新客户端连接');
    clients.add(ws); // 将新连接的客户端添加到集合中

    // 监听客户端发送的消息
    ws.on('message', message => {
        // message 是一个 Buffer，需要转换为字符串
        const msgStr = message.toString();
        console.log(`收到消息: ${msgStr}`);

        // 将收到的消息广播给所有连接的客户端
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msgStr); // 确保连接是打开状态才发送
            }
        });
    });

    // 监听客户端断开连接
    ws.on('close', () => {
        console.log('客户端已断开连接');
        clients.delete(ws); // 从集合中移除断开的客户端
    });

    // 监听错误
    ws.on('error', error => {
        console.error('WebSocket 错误:', error);
    });
});

