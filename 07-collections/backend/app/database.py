import boto3

from app.config import settings

# boto3 resolves credentials from the standard chain: the App Runner instance
# role in the cloud, your AWS profile/env locally. Table handles are lazy —
# nothing talks to AWS until the first read/write.
dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)

users_table = dynamodb.Table(settings.users_table)
