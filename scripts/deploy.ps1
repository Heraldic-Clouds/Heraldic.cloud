[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$OpenAISecretArn,

  [string]$StackName = 'heraldic-cloud',
  [string]$Region,
  [string]$CloudFrontCertificateArn,
  [switch]$UseContainer
)

$ErrorActionPreference = 'Stop'

function Invoke-Sam {
  param([string[]]$Arguments)
  & sam @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "SAM command failed with exit code $LASTEXITCODE."
  }
}

function Invoke-Aws {
  param([string[]]$Arguments)
  & aws @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "AWS CLI command failed with exit code $LASTEXITCODE."
  }
}

$validateArguments = @('validate', '--lint', '--template-file', 'template.yaml')
if ($Region) { $validateArguments += @('--region', $Region) }
Invoke-Sam $validateArguments

$buildArguments = @('build', '--template-file', 'template.yaml')
if ($UseContainer) { $buildArguments += '--use-container' }
Invoke-Sam $buildArguments

$deployArguments = @(
  'deploy',
  '--template-file', '.aws-sam/build/template.yaml',
  '--stack-name', $StackName,
  '--capabilities', 'CAPABILITY_IAM',
  '--resolve-s3',
  '--no-fail-on-empty-changeset',
  '--parameter-overrides',
  "OpenAISecretArn=$OpenAISecretArn"
)
if ($CloudFrontCertificateArn) { $deployArguments += "CloudFrontCertificateArn=$CloudFrontCertificateArn" }
if ($Region) { $deployArguments += @('--region', $Region) }
Invoke-Sam $deployArguments

$bucketQuery = "Stacks[0].Outputs[?OutputKey=='StaticSiteBucketName'].OutputValue | [0]"
$stackArguments = @('cloudformation', 'describe-stacks', '--stack-name', $StackName, '--query', $bucketQuery, '--output', 'text')
if ($Region) { $stackArguments += @('--region', $Region) }
$bucketName = & aws @stackArguments
if ($LASTEXITCODE -ne 0 -or !$bucketName -or $bucketName -eq 'None') { throw 'Could not read the static asset bucket name from the deployed stack.' }

$s3SyncArguments = @('s3', 'sync', 'dist', "s3://$bucketName", '--cache-control', 'public,max-age=300,s-maxage=86400')
$s3AssetCopyArguments = @('s3', 'cp', 'dist/assets', "s3://$bucketName/assets", '--recursive', '--cache-control', 'public,max-age=31536000,immutable')
if ($Region) {
  $s3SyncArguments += @('--region', $Region)
  $s3AssetCopyArguments += @('--region', $Region)
}
Invoke-Aws $s3SyncArguments
Invoke-Aws $s3AssetCopyArguments
foreach ($page in @('index.html', 'heraldic/index.html', 'leadership/index.html', 'mea/index.html', 'media/index.html')) {
  $pageCopyArguments = @('s3', 'cp', "dist/$page", "s3://$bucketName/$page", '--cache-control', 'public,max-age=0,s-maxage=300,must-revalidate')
  if ($Region) { $pageCopyArguments += @('--region', $Region) }
  Invoke-Aws $pageCopyArguments
}

$distributionQuery = "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue | [0]"
$stackArguments = @('cloudformation', 'describe-stacks', '--stack-name', $StackName, '--query', $distributionQuery, '--output', 'text')
if ($Region) { $stackArguments += @('--region', $Region) }
$distributionId = & aws @stackArguments
if ($LASTEXITCODE -ne 0 -or !$distributionId -or $distributionId -eq 'None') { throw 'Could not read the CloudFront distribution ID from the deployed stack.' }
$invalidationArguments = @('cloudfront', 'create-invalidation', '--distribution-id', $distributionId, '--paths', '/*', '--region', 'us-east-1')
Invoke-Aws $invalidationArguments
