# Models module - import all models so SQLAlchemy registers them
from .merchant import Merchant, FieldState
from .tenant import Tenant, Mapping
from .intake import Intake
from .offer import Offer
from .agreement import Agreement
from .background_job import BackgroundJob
from .event import Event
from .connector import Connector

# New core data model
from .deal import Deal
from .document import Document
from .metrics_snapshot import MetricsSnapshot
from .consent import Consent

__all__ = [
    "Merchant", "FieldState", "Tenant", "Mapping", "Intake", 
    "Offer", "Agreement", "BackgroundJob", "Event", "Connector",
    "Deal", "Document", "MetricsSnapshot", "Consent"
]