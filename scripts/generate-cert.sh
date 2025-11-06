#!/bin/bash

# Generate SSL certificates and RSA encryption keys for development
echo "Generating SSL certificates and RSA encryption keys for localhost..."

# Create keys directory if it doesn't exist (in project root)
mkdir -p ../keys

# Generate RSA keys for application encryption (if they don't exist)
if [ ! -f "../keys/private.pem" ] || [ ! -f "../keys/public.pem" ]; then
    echo "Generating RSA key pair for data encryption..."
    openssl genrsa -out ../keys/private.pem 2048
    openssl rsa -in ../keys/private.pem -pubout -out ../keys/public.pem
    echo "RSA encryption keys generated"
else
    echo "RSA encryption keys already exist"
fi

# Generate SSL certificate for HTTPS
echo "Generating SSL certificate for HTTPS..."

# Create a config file for the certificate
cat > cert.conf <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = Development
L = Local
O = JavaScriptSecure
OU = Development
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate the certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ../keys/key.pem \
    -out ../keys/cert.pem \
    -config cert.conf

# Clean up
rm cert.conf

echo "New certificate generated!"
echo ""
echo "Generated files:"
echo "   keys/private.pem - RSA private key (for data encryption)"
echo "   keys/public.pem  - RSA public key (for data encryption)"
echo "   keys/cert.pem    - SSL certificate (for HTTPS)"
echo "   keys/key.pem     - SSL private key (for HTTPS)"
echo ""
echo "Certificate details:"
openssl x509 -in ../keys/cert.pem -text -noout | grep -A 1 "Subject Alternative Name"

echo ""
echo "To trust this certificate in macOS:"
echo "   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain keys/cert.pem"
echo ""
echo "Restart your server with: npm run start:https"