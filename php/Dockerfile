FROM php:8.2-apache

# PHP拡張機能が必要な場合はここに追加します (今回は不要)
# RUN docker-php-ext-install pdo_mysql

# Apacheのドキュメントルートを設定
ENV APACHE_DOCUMENT_ROOT /var/www/html
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# mod_rewriteを有効化
RUN a2enmod rewrite