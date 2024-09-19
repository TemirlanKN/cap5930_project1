# Use the official Python image from Docker Hub
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the current directory contents into the container
COPY . /app

# dependencies from requirements.txt
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

COPY cap5930-project-1-e0c45772710c.json /app/service-account-key.json
ENV GOOGLE_APPLICATION_CREDENTIALS="/app/service-account-key.json"
# port 8080 for Cloud Run
EXPOSE 8080
# Command to run app
CMD ["gunicorn", "-b", ":8080", "main:app"]