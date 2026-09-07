"""
Step 16 — operations layer (PR #102 proof list). boto3 only: no API calls, no
Clerk. Alarms / dashboards / budgets / SNS exist; the two composite alarms fire
in both directions when their children are driven with SetAlarmState (OR and
AND proven both ways); and the env's GitHub-OIDC cicd role is absent (the
account-global provider is production and out of scope).
"""
import time

import pytest

pytestmark = [pytest.mark.e2e, pytest.mark.step16]

# The metric-alarm map keys (infra/alarms.tf local.metric_alarms) plus the two
# standalone rate alarms.
_METRIC_KEYS = [
    "api-high-latency", "api-high-cpu", "api-high-memory",
    "lambda-errors", "lambda-throttles", "lambda-duration",
    "sqs-dlq-messages", "sqs-queue-depth", "sqs-message-age",
    "dynamodb-user-errors", "api-5xx-error-rate", "api-4xx-error-rate",
]
_COMPOSITES = ["service-degradation", "notification-system-failure"]
_DASHBOARDS = ["operations", "database", "lambda-sqs", "errors"]
_BUDGET_SUFFIXES = ["monthly-budget", "daily-budget", "apprunner-budget",
                    "dynamodb-budget", "lambda-budget", "cloudwatch-budget"]


def _composite_state(cloudwatch, name):
    r = cloudwatch.describe_alarms(AlarmNames=[name], AlarmTypes=["CompositeAlarm"])
    alarms = r["CompositeAlarms"]
    return alarms[0]["StateValue"] if alarms else None


def _wait_composite(cloudwatch, name, want, timeout=60):
    deadline = time.monotonic() + timeout
    state = _composite_state(cloudwatch, name)
    while state != want and time.monotonic() < deadline:
        time.sleep(3)
        state = _composite_state(cloudwatch, name)
    return state


def _set_child(cloudwatch, name, value):
    cloudwatch.set_alarm_state(AlarmName=name, StateValue=value,
                               StateReason="kivan-e2e-harness synthetic")


def test_metric_alarms_exist(cloudwatch, environment):
    names = {f"kivan-{environment}-{k}" for k in _METRIC_KEYS}
    found = set()
    paginator = cloudwatch.get_paginator("describe_alarms")
    for page in paginator.paginate(AlarmNamePrefix=f"kivan-{environment}-",
                                   AlarmTypes=["MetricAlarm"]):
        found.update(a["AlarmName"] for a in page["MetricAlarms"])
    missing = names - found
    assert not missing, f"missing metric alarms: {sorted(missing)}"


def test_composite_alarms_exist_and_actioned(cloudwatch, environment):
    names = {f"kivan-{environment}-{c}" for c in _COMPOSITES}
    r = cloudwatch.describe_alarms(AlarmNames=list(names), AlarmTypes=["CompositeAlarm"])
    found = {a["AlarmName"]: a for a in r["CompositeAlarms"]}
    assert names <= set(found), f"missing composites: {sorted(names - set(found))}"
    for a in found.values():
        assert a["AlarmActions"], f"{a['AlarmName']} has no alarm action (topic)"


def test_dashboards_exist(cloudwatch, environment):
    import json
    client = cloudwatch  # dashboards live on the same cloudwatch client
    for d in _DASHBOARDS:
        body = client.get_dashboard(DashboardName=f"kivan-{environment}-{d}")
        widgets = json.loads(body["DashboardBody"]).get("widgets", [])
        assert len(widgets) >= 4, f"dashboard {d} has {len(widgets)} widgets"


def test_budgets_exist(budgets, account_id, environment):
    names = set()
    token = None
    while True:
        kwargs = {"AccountId": account_id, "MaxResults": 100}
        if token:
            kwargs["NextToken"] = token
        resp = budgets.describe_budgets(**kwargs)
        names.update(b["BudgetName"] for b in resp.get("Budgets", []))
        token = resp.get("NextToken")
        if not token:
            break
    expected = {f"kivan-{environment}-{s}" for s in _BUDGET_SUFFIXES}
    missing = expected - names
    assert not missing, f"missing budgets: {sorted(missing)}"


def test_budget_alert_topic_has_subscription(sns, account_id, aws_region, environment):
    arn = f"arn:aws:sns:{aws_region}:{account_id}:kivan-{environment}-budget-alerts"
    subs = sns.list_subscriptions_by_topic(TopicArn=arn)["Subscriptions"]
    assert subs, "budget-alerts topic has no subscription"
    assert any(s["Protocol"] == "email" for s in subs)


def test_composite_or_fires_both_ways(cloudwatch, environment):
    composite = f"kivan-{environment}-notification-system-failure"
    child = f"kivan-{environment}-sqs-dlq-messages"
    try:
        _set_child(cloudwatch, child, "ALARM")
        assert _wait_composite(cloudwatch, composite, "ALARM") == "ALARM"
        _set_child(cloudwatch, child, "OK")
        assert _wait_composite(cloudwatch, composite, "OK") == "OK"
    finally:
        _set_child(cloudwatch, child, "OK")


def test_composite_and_fires_both_ways(cloudwatch, environment):
    composite = f"kivan-{environment}-service-degradation"
    a = f"kivan-{environment}-api-5xx-error-rate"
    b = f"kivan-{environment}-api-high-latency"
    try:
        # both children ALARM → AND satisfied
        _set_child(cloudwatch, a, "ALARM")
        _set_child(cloudwatch, b, "ALARM")
        assert _wait_composite(cloudwatch, composite, "ALARM") == "ALARM"
        # drop one child → AND no longer satisfied
        _set_child(cloudwatch, b, "OK")
        assert _wait_composite(cloudwatch, composite, "OK") == "OK"
    finally:
        _set_child(cloudwatch, a, "OK")
        _set_child(cloudwatch, b, "OK")


def test_github_oidc_cicd_role_absent(iam, environment):
    """cicd is gated on var.github_repository (default ""), so a normal stack has
    no env cicd role. (The account-global OIDC provider is a production resource,
    out of scope.)"""
    role = f"kivan-github-actions-role-{environment}"
    with pytest.raises(iam.exceptions.NoSuchEntityException):
        iam.get_role(RoleName=role)
