[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^https://[^?#]+$')]
  [string]$MediaBaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$OpenAISecretArn,

  [string]$StackName = 'heraldic-cloud',
  [string]$Region,
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
  '--no-confirm-changeset',
  '--no-fail-on-empty-changeset',
  '--parameter-overrides',
  "MediaBaseUrl=$MediaBaseUrl",
  "OpenAISecretArn=$OpenAISecretArn"
)
if ($Region) { $deployArguments += @('--region', $Region) }
Invoke-Sam $deployArguments
