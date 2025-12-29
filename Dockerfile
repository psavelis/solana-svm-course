FROM node:18-alpine

# Install Solana CLI and dependencies
RUN apk add --no-cache \
    curl \
    bash \
    git \
    && curl -sSfL https://release.solana.com/v1.18.4/install | sh \
    && export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH" \
    && echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]