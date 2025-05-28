# =============================================
# MuStore Nginx Configuration
# =============================================

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Логирование
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;

    # Оптимизация
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip сжатие
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml application/atom+xml application/xhtml+xml
               application/font-woff application/font-woff2
               image/svg+xml;

    # Основной сервер
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Безопасность
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # Статические файлы frontend
        location / {
            try_files $uri $uri/ /index.html;
            
            # Кэширование статических ресурсов
            location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # Проксирование API запросов
        location /api/ {
            proxy_pass http://backend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Таймауты
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Проксирование загруженных файлов
        location /uploads/ {
            proxy_pass http://backend:3000/uploads/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            
            # Кэширование изображений
            expires 30d;
            add_header Cache-Control "public, must-revalidate";
        }

        # Страница 404
        error_page 404 /404.html;
        location = /404.html {
            internal;
        }

        # Страница 50x
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            internal;
        }

        # Запрет доступа к скрытым файлам
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }

        # Favicon
        location = /favicon.ico {
            log_not_found off;
            access_log off;
        }

        # Robots.txt
        location = /robots.txt {
            log_not_found off;
            access_log off;
        }
    }
}