FROM node:22-slim

WORKDIR /app
COPY ./api /app
RUN npm ci --omit=dev

ENV PORT=3000
EXPOSE ${PORT}

CMD ["npm", "start"]