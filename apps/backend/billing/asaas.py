import requests
from django.conf import settings


class AsaasClient:
    def __init__(self):
        self.base_url = settings.ASAAS_API_URL.rstrip("/")
        self.api_key = settings.ASAAS_API_KEY

    @property
    def headers(self):
        return {"access_token": self.api_key, "Content-Type": "application/json"}

    def _request(self, method: str, path: str, payload: dict | None = None):
        response = requests.request(
            method=method,
            url=f"{self.base_url}{path}",
            json=payload or {},
            headers=self.headers,
            timeout=20,
        )
        response.raise_for_status()
        return response.json()

    def create_customer(self, *, name: str, email: str = "", mobile_phone: str = "", cpf_cnpj: str = ""):
        payload = {
            "name": name,
            "email": email or None,
            "mobilePhone": mobile_phone or None,
            "cpfCnpj": cpf_cnpj or None,
        }
        payload = {k: v for k, v in payload.items() if v}
        return self._request("POST", "/customers", payload)

    def create_subscription(
        self,
        *,
        customer_id: str,
        billing_type: str,
        value: float,
        next_due_date: str,
        cycle: str = "MONTHLY",
        description: str = "Licença GRDados CRM",
    ):
        payload = {
            "customer": customer_id,
            "billingType": billing_type,
            "value": value,
            "nextDueDate": next_due_date,
            "cycle": cycle,
            "description": description,
        }
        return self._request("POST", "/subscriptions", payload)
