import os
import sys

HERE = os.path.split(os.path.abspath(__file__))[0]     # looks awful, but gets the parent dir
PARENT = os.path.split(HERE)[0]
sys.path.append(PARENT+"/deps")
sys.path.append(PARENT+"/webapps")

MODULE_CACHE_DIR = '/tmp/rocstar/mako_modules'      # change "my_app_name" to your application name

import web

from templating import Configure

Configure(
    [os.path.join(PARENT, 'templates')], 
    module_cache_dir = MODULE_CACHE_DIR
)

from rxr_handlers import *

URLS = (
    '/','rxr_handlers.rxr',
    '/plot_all','rxr_handlers.plot_all',
    '/vols','rxr_handlers.volumes',
    '/days','rxr_handlers.days',
    '/builds','rxr_handlers.builds',
    '/(js|css|images)/(.*)','static'      
)

app = web.application(URLS, globals())
application = app.wsgifunc()
if __name__ == '__main__':
    app.run()

