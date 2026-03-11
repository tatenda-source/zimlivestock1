"""
Paynow payment service using the official Paynow Python SDK.
SDK docs: https://developers.paynow.co.zw/docs/python_quickstart.html
"""
import logging
import os
from paynow import Paynow
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Initialise Paynow SDK ────────────────────────────────────────────────────

# warn if environment variables are not configured; this helps developers
integration_id = os.getenv("PAYNOW_INTEGRATION_ID", "")
integration_key = os.getenv("PAYNOW_INTEGRATION_KEY", "")
if not integration_id or not integration_key:
    logger.warning("Paynow credentials are not set. Payment operations will fail until PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY are provided.")

def _get_paynow() -> Paynow:
    """
    Returns a configured Paynow instance.
    Called every time so that env vars are always fresh (supports runtime reload).
    """
    integration_id = os.getenv("PAYNOW_INTEGRATION_ID", "")
    integration_key = os.getenv("PAYNOW_INTEGRATION_KEY", "")
    result_url = os.getenv("PAYNOW_RESULT_URL", "http://localhost:8000/payments/webhook")
    return_url = os.getenv("PAYNOW_RETURN_URL", "http://localhost:8000/payment-complete")

    if not integration_id or not integration_key:
        raise EnvironmentError(
            "PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY must be set in your .env file."
        )

    return Paynow(integration_id, integration_key, result_url, return_url)


# ─── Web / Browser Payments ───────────────────────────────────────────────────

def initiate_web_payment(reference: str, email: str, description: str, amount: float) -> dict:
    """
    Creates a standard web-based Paynow payment.

    Args:
        reference:   Unique merchant reference (e.g. "ZL-12-AB123")
        email:       Buyer's email address
        description: Human-readable item description
        amount:      Amount in USD

    Returns:
        dict with keys: redirect_url, poll_url
    """
    paynow = _get_paynow()

    # Create the payment object with reference + buyer email
    payment = paynow.create_payment(reference, email)

    # Add the auction item as a line item
    payment.add(description, amount)

    # Send to Paynow
    response = paynow.send(payment)

    if not response.success:
        # Try to extract error message from various possible attributes
        error_msg = None
        
        # Check response.data dict first (paynow SDK returns error here)
        if hasattr(response, 'data') and isinstance(response.data, dict):
            error_msg = response.data.get('error')
        
        # Fallback: check response.error attribute
        if not error_msg and hasattr(response, 'error'):
            error_attr = getattr(response, 'error')
            if isinstance(error_attr, str):
                error_msg = error_attr
        
        # Final fallback
        if not error_msg and hasattr(response, 'status'):
            error_msg = getattr(response, 'status')
        
        error_msg = error_msg or 'Paynow API request failed'
        raise ValueError(f"Paynow web payment initiation failed: {error_msg}")

    return {
        "redirect_url": response.redirect_url,
        "poll_url": response.poll_url,
    }


# ─── Mobile Payments (EcoCash / OneMoney) ────────────────────────────────────

def initiate_mobile_payment(reference: str, email: str, description: str,
                             amount: float, phone: str, method: str) -> dict:
    """
    Creates an express mobile checkout (EcoCash / OneMoney).
    The user gets a USSD prompt on their phone — no browser redirect needed.

    Args:
        reference:   Unique merchant reference
        email:       Buyer's email address
        description: Item description
        amount:      Amount in USD
        phone:       Zimbabwean mobile number (e.g. "0777123456")
        method:      "ecocash" or "onemoney"

    Returns:
        dict with keys: poll_url, instructions
    """
    if method not in ("ecocash", "onemoney"):
        raise ValueError(f"Unsupported mobile method '{method}'. Use 'ecocash' or 'onemoney'.")

    paynow = _get_paynow()

    payment = paynow.create_payment(reference, email)
    payment.add(description, amount)

    # Mobile payments use send_mobile instead of send
    response = paynow.send_mobile(payment, phone, method)

    if not response.success:
        # Try to extract error message from various possible attributes
        error_msg = None
        
        # Check response.data dict first (paynow SDK returns error here)
        if hasattr(response, 'data') and isinstance(response.data, dict):
            error_msg = response.data.get('error')
        
        # Fallback: check response.error attribute
        if not error_msg and hasattr(response, 'error'):
            error_attr = getattr(response, 'error')
            if isinstance(error_attr, str):
                error_msg = error_attr
        
        # Final fallback
        if not error_msg and hasattr(response, 'status'):
            error_msg = getattr(response, 'status')
        
        error_msg = error_msg or 'Paynow API request failed'
        raise ValueError(f"Paynow mobile payment initiation failed: {error_msg}")

    return {
        "poll_url": response.poll_url,
        "instructions": getattr(response, "instructions", "Check your phone for the payment prompt."),
    }


# ─── Transaction Status Polling ───────────────────────────────────────────────

def check_payment_status(poll_url: str) -> dict:
    """
    Polls Paynow for the latest status of a transaction.

    Args:
        poll_url: The poll URL returned when the payment was initiated

    Returns:
        dict with keys: paid (bool), status (str)
    """
    paynow = _get_paynow()
    status = paynow.check_transaction_status(poll_url)

    return {
        "paid": status.paid,
        "status": status.status,
    }


def verify_paynow_webhook(data: dict) -> bool:
    """
    Verifies the SHA512 hash sent by Paynow in a webhook POST.
    This prevents malicious users from spoofing payment success.
    """
    try:
        paynow = _get_paynow()
        # The Paynow SDK provides verify_hash(data) to check the signature
        return paynow.verify_hash(data)
    except Exception as e:
        logger.error("Paynow hash verification failed: %s", e)
        return False
