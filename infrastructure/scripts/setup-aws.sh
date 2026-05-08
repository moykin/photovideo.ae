#!/bin/bash
# ============================================================
# PhotoVideo.ae — AWS S3 + CloudFront Setup
# Run from your local machine with AWS CLI configured
# ============================================================
set -euo pipefail

BUCKET="photovideo-ae-media"
REGION="ap-south-1"
DOMAIN="photovideo.ae"

echo "╔══════════════════════════════════════╗"
echo "║   PhotoVideo.ae AWS Infrastructure  ║"
echo "╚══════════════════════════════════════╝"

# ── S3 Bucket ────────────────────────────────────────────────
echo "→ Creating S3 bucket: $BUCKET..."
aws s3api create-bucket \
    --bucket $BUCKET \
    --region $REGION \
    --create-bucket-configuration LocationConstraint=$REGION

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET \
    --versioning-configuration Status=Enabled

# Block all public access (CloudFront only)
aws s3api put-public-access-block \
    --bucket $BUCKET \
    --public-access-block-configuration \
        BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# CORS for Strapi uploads
aws s3api put-bucket-cors --bucket $BUCKET --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["https://photovideo.ae", "https://api.photovideo.ae", "http://localhost:1337", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }]
}'

# Lifecycle: delete old multipart uploads
aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET --lifecycle-configuration '{
  "Rules": [{
    "ID": "cleanup-incomplete-uploads",
    "Status": "Enabled",
    "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
  }]
}'

echo "✅ S3 bucket created: $BUCKET"

# ── CloudFront distribution ──────────────────────────────────
echo "→ Creating CloudFront OAC..."

OAC_ID=$(aws cloudfront create-origin-access-control \
    --origin-access-control-config '{
        "Name": "photovideo-oac",
        "Description": "OAC for photovideo.ae S3 media",
        "SigningProtocol": "sigv4",
        "SigningBehavior": "always",
        "OriginAccessControlOriginType": "s3"
    }' \
    --query 'OriginAccessControl.Id' \
    --output text)

echo "→ OAC ID: $OAC_ID"
echo "→ Creating CloudFront distribution..."

CF_DIST=$(aws cloudfront create-distribution --distribution-config "{
    \"CallerReference\": \"photovideo-$(date +%s)\",
    \"Comment\": \"PhotoVideo.ae Media CDN\",
    \"DefaultCacheBehavior\": {
        \"TargetOriginId\": \"S3-$BUCKET\",
        \"ViewerProtocolPolicy\": \"redirect-to-https\",
        \"CachePolicyId\": \"658327ea-f89d-4fab-a63d-7e88639e58f6\",
        \"OriginRequestPolicyId\": \"88a5eaf4-2fd4-4709-b370-b4c650ea3fcf\",
        \"Compress\": true,
        \"AllowedMethods\": {
            \"Quantity\": 2,
            \"Items\": [\"GET\", \"HEAD\"]
        }
    },
    \"Origins\": {
        \"Quantity\": 1,
        \"Items\": [{
            \"Id\": \"S3-$BUCKET\",
            \"DomainName\": \"$BUCKET.s3.$REGION.amazonaws.com\",
            \"OriginAccessControlId\": \"$OAC_ID\",
            \"S3OriginConfig\": { \"OriginAccessIdentity\": \"\" }
        }]
    },
    \"Enabled\": true,
    \"HttpVersion\": \"http2and3\",
    \"IsIPV6Enabled\": true,
    \"PriceClass\": \"PriceClass_200\",
    \"DefaultRootObject\": \"\",
    \"Aliases\": {
        \"Quantity\": 1,
        \"Items\": [\"cdn.$DOMAIN\"]
    }
}")

CF_ID=$(echo $CF_DIST | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Distribution']['Id'])")
CF_DOMAIN=$(echo $CF_DIST | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Distribution']['DomainName'])")

echo "→ CloudFront ID: $CF_ID"
echo "→ CloudFront Domain: $CF_DOMAIN"

# Update S3 bucket policy to allow CloudFront OAC
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3api put-bucket-policy --bucket $BUCKET --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
        \"Sid\": \"AllowCloudFrontServicePrincipal\",
        \"Effect\": \"Allow\",
        \"Principal\": { \"Service\": \"cloudfront.amazonaws.com\" },
        \"Action\": \"s3:GetObject\",
        \"Resource\": \"arn:aws:s3:::$BUCKET/*\",
        \"Condition\": {
            \"StringEquals\": {
                \"AWS:SourceArn\": \"arn:aws:cloudfront::$ACCOUNT_ID:distribution/$CF_ID\"
            }
        }
    }]
}"

# ── IAM user for Strapi ──────────────────────────────────────
echo "→ Creating IAM user for Strapi..."
aws iam create-user --user-name strapi-photovideo 2>/dev/null || true

aws iam put-user-policy --user-name strapi-photovideo \
    --policy-name S3MediaAccess \
    --policy-document "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [
            {
                \"Effect\": \"Allow\",
                \"Action\": [\"s3:GetObject\",\"s3:PutObject\",\"s3:DeleteObject\",\"s3:GetObjectAcl\",\"s3:PutObjectAcl\"],
                \"Resource\": \"arn:aws:s3:::$BUCKET/*\"
            },
            {
                \"Effect\": \"Allow\",
                \"Action\": [\"s3:ListBucket\",\"s3:GetBucketLocation\"],
                \"Resource\": \"arn:aws:s3:::$BUCKET\"
            }
        ]
    }"

KEYS=$(aws iam create-access-key --user-name strapi-photovideo)
ACCESS_KEY=$(echo $KEYS | python3 -c "import sys,json; k=json.load(sys.stdin); print(k['AccessKey']['AccessKeyId'])")
SECRET_KEY=$(echo $KEYS | python3 -c "import sys,json; k=json.load(sys.stdin); print(k['AccessKey']['SecretAccessKey'])")

echo ""
echo "════════════════════════════════════════════════"
echo "✅ AWS Infrastructure created!"
echo ""
echo "Add to backend/.env:"
echo "  AWS_ACCESS_KEY_ID=$ACCESS_KEY"
echo "  AWS_SECRET_ACCESS_KEY=$SECRET_KEY"
echo "  AWS_REGION=$REGION"
echo "  AWS_BUCKET=$BUCKET"
echo "  CDN_URL=https://cdn.$DOMAIN"
echo ""
echo "DNS Record needed:"
echo "  CNAME cdn.$DOMAIN → $CF_DOMAIN"
echo ""
echo "⚠️  Save the IAM keys above — they won't be shown again!"
echo "════════════════════════════════════════════════"
