FROM node:22-slim

RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

WORKDIR /app
COPY ./api /app
RUN npm ci --omit=dev --ignore-scripts

RUN mkdir -p /app/uploads && chown -R appuser:appuser /app/uploads
ENV UPLOADS_DIR=/app/uploads

ENV PORT=3000
EXPOSE ${PORT}

USER appuser

CMD ["npm", "start"]