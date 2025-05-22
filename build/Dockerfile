FROM node:22-slim

RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

WORKDIR /app
COPY ./api /app
RUN npm ci --omit=dev --ignore-scripts

ENV PORT=3000
EXPOSE ${PORT}

USER appuser

CMD ["npm", "start"]